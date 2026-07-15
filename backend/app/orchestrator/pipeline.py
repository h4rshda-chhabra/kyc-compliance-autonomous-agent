"""Single entry point for running a company audit end to end:

    AgentOrchestrator.execute_audit()  ->  AuditResult
    RiskChangeDetector.compare()       ->  ChangeResult
    AgentOrchestrator.finalize()       ->  persisted outcome

Both the scheduled sweep and manual "scan now" trigger call this instead of
touching AgentOrchestrator/RiskChangeDetector directly, so the two never drift
out of sync on how a run gets decided and recorded.
"""

from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.company_audit_state import CompanyAuditState
from app.orchestrator.orchestrator import AgentOrchestrator
from app.services.risk_change_detector import RiskChangeDetector


def run_company_audit(company_id: str, db: Session, trigger_type: str = "manual") -> Dict[str, Any]:
    orchestrator = AgentOrchestrator(company_id=company_id, db=db)
    audit_result = orchestrator.execute_audit(trigger_type=trigger_type)

    previous_state = db.get(CompanyAuditState, company_id)
    change_result = RiskChangeDetector().compare(previous_state, audit_result)

    return orchestrator.finalize(audit_result, change_result)
