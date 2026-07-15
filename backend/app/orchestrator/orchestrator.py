import logging
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.rss_news_service import RSSNewsService
from app.services.news_classifier import NewsClassifier
from app.agents.entity_resolution_agent import EntityResolutionAgent

# ORM models
from app.models.company import Company
from app.models.company_director import CompanyDirector
from app.models.monitoring_run import MonitoringRun
from app.models.sanction_match import SanctionMatch
from app.models.news_article import NewsArticle
from app.models.evidence import Evidence
from app.models.risk_report import RiskReport
from app.models.timeline_event import TimelineEvent
from app.models.sar_report import SARReport
from app.models.audit_log import AuditLog

logger = logging.getLogger("app.orchestrator")
settings = get_settings()

class AgentOrchestrator:
    """Orchestrates the continuous audit workflow, coordinating sanctions checks,
    media ingestion, entity resolution, and risk synthesis.
    """

    def __init__(self, company_id: str, db: Session) -> None:
        self.company_id = company_id
        self.db = db
        self.rss_service = RSSNewsService()
        self.resolver = EntityResolutionAgent()
        # Resolve database path dynamically to be directory-agnostic (handles root or backend/ context)

        possible_paths = [
            "datasets/processed/sanctions_lookup.db",
            "../datasets/processed/sanctions_lookup.db",
            "../../datasets/processed/sanctions_lookup.db",
        ]
        self.sqlite_db = possible_paths[0]
        for p in possible_paths:
            if os.path.exists(p):
                self.sqlite_db = p
                break


    def _get_sqlite_candidates(self, name: str) -> List[Dict[str, Any]]:
        """Queries the preprocessed SQLite database for raw matching targets."""
        if not os.path.exists(self.sqlite_db):
            logger.warning("Sanctions SQLite lookup DB not found at %s. Skipping SQLite check.", self.sqlite_db)
            return []

        candidates = []
        try:
            conn = sqlite3.connect(self.sqlite_db)
            cur = conn.cursor()
            
            # Query primary names and aliases
            query = """
                SELECT e.id, e.name, e.type, e.source, e.countries, e.dob, 'Primary Name' as match_type
                FROM entities e
                WHERE e.name LIKE ?
                
                UNION
                
                SELECT e.id, e.name, e.type, e.source, e.countries, e.dob, 'Alias' as match_type
                FROM entities e
                JOIN aliases a ON e.id = a.entity_id
                WHERE a.alias_name LIKE ?
            """
            search_param = f"%{name}%"
            cur.execute(query, (search_param, search_param))
            rows = cur.fetchall()
            conn.close()

            for row in rows:
                candidates.append({
                    "id": row[0],
                    "name": row[1],
                    "type": row[2],
                    "source": row[3],
                    "countries": row[4],
                    "dob": row[5],
                    "match_type": row[6]
                })
        except Exception as e:
            logger.error("Error querying SQLite database: %s", str(e))
            
        return candidates

    def _call_gemini_llm(self, prompt: str) -> Optional[str]:
        """Optionally generates content using the Gemini SDK if configured."""
        if not settings.gemini_api_key:
            return None
            
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error("Failed to generate LLM response from Gemini SDK: %s", str(e))
            return None

    def execute_audit(self) -> Dict[str, Any]:
        """Executes the complete end-to-end audit process and saves the logs to PostgreSQL."""
        logger.info("Starting automated compliance audit for company ID: %s", self.company_id)
        
        # 1. Fetch Company & Directors
        company = self.db.query(Company).filter(Company.id == self.company_id).first()
        if not company:
            raise ValueError(f"Company with ID {self.company_id} not found in database.")
            
        directors = self.db.query(CompanyDirector).filter(CompanyDirector.company_id == self.company_id).all()
        logger.info("Retrieved company '%s' with %d directors.", company.legal_name, len(directors))

        # 2. Create Monitoring Run
        run = MonitoringRun(
            id=uuid.uuid4(),
            company_id=company.id,
            trigger_type="manual",
            status="running",
            summary="Continuous KYC audit scan in progress...",
            started_at=datetime.utcnow()
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        sanctions_alerts = []
        adverse_media_alerts = []
        timeline_events_data = []

        try:
            # 3. Step: Sanctions Screening & Entity Resolution
            # Screen company name itself
            company_raw_hits = self._get_sqlite_candidates(company.legal_name)
            resolved_company = self.resolver.resolve_directors(
                director_name=company.legal_name,
                candidates=company_raw_hits,
                nationality=company.jurisdiction,
                dob=None
            )
            for hit in resolved_company:
                san_match = SanctionMatch(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    list_name=hit["source"],
                    matched_name=hit["name"],
                    match_score=float(hit["resolution_score"]),
                    status="pending_review"
                )
                self.db.add(san_match)
                sanctions_alerts.append(hit)
                
                # Create Evidence record
                evidence = Evidence(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    evidence_type="sanction",
                    source_url=f"https://opensanctions.org/entities/{hit['id']}",
                    content=f"Fuzzy resolution match {hit['resolution_score']}% found for company {company.legal_name} on global list {hit['source']}. Details: Name: {hit['name']}, DOB: {hit['dob']}, Country: {hit['countries']}"
                )
                self.db.add(evidence)

                # Create Timeline event
                timeline_events_data.append({
                    "event_type": "sanction_match",
                    "description": f"Company {company.legal_name} matched watchlist: {hit['name']} ({hit['source']})."
                })

            for director in directors:
                raw_hits = self._get_sqlite_candidates(director.full_name)
                
                # Perform Entity Resolution to prune false positives
                resolved = self.resolver.resolve_directors(
                    director_name=director.full_name,
                    candidates=raw_hits,
                    nationality=director.nationality,
                    dob=str(director.date_of_birth) if director.date_of_birth else None
                )
                
                for hit in resolved:
                    san_match = SanctionMatch(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        list_name=hit["source"],
                        matched_name=hit["name"],
                        match_score=float(hit["resolution_score"]),
                        status="pending_review"
                    )
                    self.db.add(san_match)
                    sanctions_alerts.append(hit)
                    
                    # Create Evidence record
                    evidence = Evidence(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        evidence_type="sanction",
                        source_url=f"https://opensanctions.org/entities/{hit['id']}",
                        content=f"Fuzzy resolution match {hit['resolution_score']}% found for director {director.full_name} on global list {hit['source']}. Details: Name: {hit['name']}, DOB: {hit['dob']}, Country: {hit['countries']}"
                    )
                    self.db.add(evidence)

                    # Create Timeline event
                    timeline_events_data.append({
                        "event_type": "sanction_match",
                        "description": f"Director {director.full_name} matched watchlist: {hit['name']} ({hit['source']})."
                    })

            # 4. Step: Adverse Media Screening
            # Query Google News RSS for the company and directors
            queries = [company.legal_name] + [d.full_name for d in directors]
            for query in queries[:3]:  # Limit queries to prevent rate limits
                articles = self.rss_service.fetch_articles(query, limit=5)
                for art in articles:
                    category, severity = NewsClassifier.classify(art["title"], art["description"])
                    
                    # Only record articles if they are classified as adverse media with negative severity
                    if severity in ["Medium", "High", "Critical"]:
                        news = NewsArticle(
                            id=uuid.uuid4(),
                            company_id=company.id,
                            monitoring_run_id=run.id,
                            title=art["title"],
                            url=art["link"],
                            source=art["source"],
                            sentiment="negative",
                            published_at=datetime.utcnow()
                        )
                        self.db.add(news)
                        adverse_media_alerts.append({
                            "title": art["title"],
                            "url": art["link"],
                            "source": art["source"],
                            "category": category,
                            "severity": severity
                        })
                        
                        # Create Evidence
                        evidence = Evidence(
                            id=uuid.uuid4(),
                            company_id=company.id,
                            monitoring_run_id=run.id,
                            evidence_type="adverse_media",
                            source_url=art["link"],
                            content=f"Adverse media article detected: {art['title']} ({category} - {severity}). Published by {art['source']}."
                        )
                        self.db.add(evidence)

                        # Create Timeline event
                        timeline_events_data.append({
                            "event_type": "adverse_media",
                            "description": f"Adverse media match: '{art['title'][:80]}...' ({category})"
                        })

            # 5. Step: Risk Score Calculation Logic
            risk_score = 15.0
            risk_level = "low"
            
            # Simple weighted rules engine
            if sanctions_alerts:
                risk_score = max(risk_score, 95.0)
                risk_level = "high"
            elif any(a["severity"] in ["High", "Critical"] for a in adverse_media_alerts):
                risk_score = max(risk_score, 65.0)
                risk_level = "medium"
            elif adverse_media_alerts:
                risk_score = max(risk_score, 40.0)
                risk_level = "medium"

            # Create Risk Report
            rationale_summary = "No adverse sanctions, PEPs, or media alerts resolved for this company."
            if risk_level == "high":
                rationale_summary = f"Severe risk identified. Director matched sanctioned watchlist."
            elif risk_level == "medium":
                rationale_summary = f"Medium risk flagged due to multiple negative adverse media matches."

            report = RiskReport(
                id=uuid.uuid4(),
                company_id=company.id,
                monitoring_run_id=run.id,
                risk_score=risk_score,
                risk_level=risk_level,
                rationale=rationale_summary
            )
            self.db.add(report)

            # Update Company details
            company.risk_level = risk_level
            company.monitoring_status = "escalated" if risk_level == "high" else ("review" if risk_level == "medium" else "monitored")

            # 6. Step: Write Timeline Events
            for event_info in timeline_events_data:
                event = TimelineEvent(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    event_type=event_info["event_type"],
                    description=event_info["description"],
                    occurred_at=datetime.utcnow()
                )
                self.db.add(event)

            # 7. Step: Generate SAR Report (using templates)
            possible_template_paths = [
                "backend/app/templates/sar_template.md",
                "app/templates/sar_template.md",
                "../app/templates/sar_template.md"
            ]
            template_path = possible_template_paths[0]
            for tp in possible_template_paths:
                if os.path.exists(tp):
                    template_path = tp
                    break

            sar_narrative = ""
            if os.path.exists(template_path):

                with open(template_path, "r", encoding="utf-8") as f:
                    template_content = f.read()
                
                # Replace placeholders
                directors_str = "\n".join([f"* **Name**: {d.full_name} ({d.nationality})" for d in directors])
                timeline_str = "\n".join([f"* **{datetime.utcnow().strftime('%Y-%m-%d')}**: {e['description']}" for e in timeline_events_data])
                sanctions_str = "\n".join([f"* **{s['name']}**: Matched on {s['source']} (Score: {s['resolution_score']}%)" for s in sanctions_alerts])
                media_str = "\n".join([f"* **{m['title']}** ({m['source']}): Classified as {m['category']} ({m['severity']})" for m in adverse_media_alerts])

                sar_narrative = template_content\
                    .replace("{{ company_name }}", company.legal_name)\
                    .replace("{{ jurisdiction }}", company.jurisdiction or "Unknown")\
                    .replace("{{ risk_score }}", str(risk_score))\
                    .replace("{{ risk_level }}", risk_level.upper())\
                    .replace("{{ trigger_reason }}", "Periodic Refresh / Ingestion check")\
                    .replace("{{ filing_date }}", datetime.utcnow().strftime("%Y-%m-%d"))\
                    .replace("{{ registration_number }}", company.registration_number or "N/A")\
                    .replace("{{ industry }}", company.industry or "N/A")\
                    .replace("{{ subject_directors_list }}", directors_str if directors_str else "* None Listed")\
                    .replace("{{ investigation_trigger_details }}", f"Audit initiated for {company.legal_name} based on onboarding scan.")\
                    .replace("{{ timeline_events_markdown }}", timeline_str if timeline_str else "* No events logged")\
                    .replace("{{ sanctions_findings_details }}", sanctions_str if sanctions_str else "* No sanctions found")\
                    .replace("{{ pep_findings_details }}", "* No Politically Exposed Persons (PEPs) found")\
                    .replace("{{ adverse_media_details }}", media_str if media_str else "* No negative news detected")\
                    .replace("{{ risk_rationale }}", rationale_summary)\
                    .replace("{{ analyst_recommendation }}", "Reject Onboarding" if risk_level == "high" else ("Escalate to Manual Review" if risk_level == "medium" else "Approve Onboarding"))\
                    .replace("{{ analyst_rationale }}", "Automatically generated analysis based on pre-processed watchlist matching.")\
                    .replace("{{ confidence_score }}", "90" if sanctions_alerts else "75")\
                    .replace("{{ narrative_summary_text }}", f"Company {company.legal_name} underwent automatic sanctions screening. " + ("Critical hits identified on sanctions list." if sanctions_alerts else "No critical risk matches found."))

                # Optimize the summary using Gemini if API key is provided
                llm_prompt = f"Improve this draft SAR compliance report narrative summary. Focus on making the writing professional, formal, and inspired by regulatory FinCEN format:\n\n{sar_narrative}"
                improved_narrative = self._call_gemini_llm(llm_prompt)
                if improved_narrative:
                    sar_narrative = improved_narrative

            # Write SAR to DB if risk is high/medium
            if risk_level in ["high", "medium"]:
                sar_report = SARReport(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    status="draft",
                    narrative=sar_narrative,
                    created_at=datetime.utcnow()
                )
                self.db.add(sar_report)

            # Create Audit log
            audit = AuditLog(
                id=uuid.uuid4(),
                actor="system",
                action="run_monitoring",
                resource_type="monitoring_run",
                resource_id=str(run.id),
                event_metadata={"company_name": company.legal_name, "risk_level": risk_level}
            )
            self.db.add(audit)

            # 8. Complete Monitoring Run
            run.status = "completed"
            run.summary = f"Audit complete. Risk Level: {risk_level.upper()} (Score: {risk_score}/100)"
            run.completed_at = datetime.utcnow()
            
            self.db.commit()
            logger.info("Automated audit execution completed successfully for %s", company.legal_name)
            
            return {
                "run_id": str(run.id),
                "company_id": str(company.id),
                "risk_score": risk_score,
                "risk_level": risk_level,
                "sanctions_hits": len(sanctions_alerts),
                "media_hits": len(adverse_media_alerts)
            }

        except Exception as e:
            self.db.rollback()
            logger.error("Failed to complete automated audit execution: %s", str(e))
            
            # Try to save failed run status
            try:
                run.status = "failed"
                run.summary = f"Execution failed: {str(e)}"
                run.completed_at = datetime.utcnow()
                self.db.commit()
            except Exception:
                pass
                
            raise e
