import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Company, Evidence, MonitoringRun, RiskReport, SARReport
from app.services.company_directory import get_company as get_directory_company
from app.services.sanctions_screening import SanctionsMatch, screen_name

router = APIRouter(prefix="/monitor", tags=["monitor"])


def _serialize(run: MonitoringRun) -> dict:
    return {
        "id": str(run.id),
        "company_id": run.company_id,
        "trigger_type": run.trigger_type,
        "status": run.status,
        "summary": run.summary,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "created_at": run.created_at,
    }


@router.get("/runs")
def list_monitoring_runs(db: Session = Depends(get_db)) -> list[dict]:
    runs = db.query(MonitoringRun).order_by(MonitoringRun.created_at.desc()).all()
    return [_serialize(r) for r in runs]


@router.get("/runs/{run_id}")
def get_monitoring_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    run = db.get(MonitoringRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Monitoring run not found")
    return _serialize(run)


def _risk_from_top_score(top_score: float | None) -> tuple[str, float]:
    """Map the best sanctions-match score to a risk level/score for this scan."""
    if top_score is None:
        return "low", 5.0
    if top_score >= 0.85:
        return "critical", round(top_score * 100, 1)
    if top_score >= 0.7:
        return "high", round(top_score * 100, 1)
    return "medium", round(top_score * 100, 1)


def _sar_narrative(company: Company, matches: list[SanctionsMatch], risk_score: float) -> str:
    lines = [
        f"Continuous KYC monitoring flagged {company.legal_name} "
        f"(risk score {risk_score:.0f}/100) after sanctions screening returned "
        f"{len(matches)} potential match(es):",
    ]
    for match in matches:
        lines.append(
            f"- '{match.matched_name}' on {match.source} (similarity {match.score:.0%})"
        )
    lines.append(
        "Recommended actions: enhanced due diligence, transaction review, and "
        "escalation pending human reviewer sign-off."
    )
    return "\n".join(lines)


@router.post("/companies/{company_id}/trigger")
def trigger_manual_run(company_id: str, db: Session = Depends(get_db)) -> dict:
    company = db.get(Company, company_id)
    if company is None:
        # First scan: materialize the company from the sanctions dataset directory.
        entity = get_directory_company(company_id)
        if entity is None:
            raise HTTPException(status_code=404, detail="Company not found")
        company = Company(
            id=entity.id,
            legal_name=entity.name,
            jurisdiction=entity.countries,
            industry=entity.source,
            monitoring_status="onboarding",
            risk_level="unknown",
            onboarded_at=datetime.now(UTC),
        )
        db.add(company)
        db.flush()

    run = MonitoringRun(
        company_id=company.id,
        trigger_type="manual",
        status="running",
        started_at=datetime.now(UTC),
    )
    db.add(run)
    db.flush()  # assigns run.id for the evidence/risk/SAR rows below

    matches = screen_name(company.legal_name)
    for match in matches:
        db.add(
            Evidence(
                company_id=company.id,
                monitoring_run_id=run.id,
                evidence_type="sanction",
                source_url=None,
                content=(
                    f"Potential sanctions match: '{match.matched_name}' "
                    f"({match.source}) — similarity {match.score:.0%}"
                ),
            )
        )

    top_score = matches[0].score if matches else None
    risk_level, risk_score = _risk_from_top_score(top_score)

    db.add(
        RiskReport(
            company_id=company.id,
            monitoring_run_id=run.id,
            risk_score=risk_score,
            risk_level=risk_level,
            rationale=(
                f"Sanctions screen found {len(matches)} potential match(es) for "
                f"'{company.legal_name}'; highest similarity {top_score:.0%}."
                if matches
                else f"Sanctions screen found no matches for '{company.legal_name}'."
            ),
        )
    )

    sar_drafted = False
    if risk_level in ("high", "critical"):
        has_pending_sar = (
            db.query(SARReport)
            .filter(SARReport.company_id == company.id, SARReport.status == "pending_review")
            .first()
            is not None
        )
        if not has_pending_sar:
            db.add(
                SARReport(
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    status="pending_review",
                    narrative=_sar_narrative(company, matches, risk_score),
                )
            )
            sar_drafted = True

    company.risk_level = risk_level
    company.monitoring_status = "escalated" if risk_level == "critical" else "active"

    run.status = "completed"
    run.completed_at = datetime.now(UTC)
    run.summary = (
        f"{len(matches)} potential sanctions match(es) found."
        + (" Draft SAR generated for review." if sar_drafted else "")
        if matches
        else "No sanctions matches found."
    )

    db.add(
        AuditLog(
            actor="sanctions_agent",
            action="monitoring_run_completed",
            resource_type="monitoring_run",
            resource_id=str(run.id),
            event_metadata={
                "company_id": company.id,
                "matches": len(matches),
                "risk_level": risk_level,
                "sar_drafted": sar_drafted,
            },
        )
    )

    db.commit()
    db.refresh(run)
    return _serialize(run)
