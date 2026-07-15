import uuid
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SARReport, Company, HumanReview, AuditLog
from app.schemas.review import SarDecisionRequest

router = APIRouter(prefix="/review", tags=["review"])


def _serialize(sar: SARReport) -> dict:
    return {
        "id": str(sar.id),
        "company_id": sar.company_id,
        "monitoring_run_id": str(sar.monitoring_run_id) if sar.monitoring_run_id else None,
        "status": sar.status,
        "narrative": sar.narrative,
        "filed_at": sar.filed_at,
        "created_at": sar.created_at,
    }


@router.get("/sar")
def list_sar_reports(db: Session = Depends(get_db)) -> list[dict]:
    reports = db.query(SARReport).order_by(SARReport.created_at.desc()).all()
    return [_serialize(r) for r in reports]


@router.get("/sar/{sar_id}")
def get_sar_report(sar_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    report = db.get(SARReport, sar_id)
    if report is None:
        raise HTTPException(status_code=404, detail="SAR report not found")
    return _serialize(report)


@router.post("/sar/{sar_id}/decision")
def submit_review_decision(
    sar_id: uuid.UUID, payload: SarDecisionRequest, db: Session = Depends(get_db)
) -> dict:
    report = db.get(SARReport, sar_id)
    if report is None:
        raise HTTPException(status_code=404, detail="SAR report not found")

    decision = payload.decision
    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'")

    report.status = decision
    
    # Find and update corresponding company risk/monitoring status
    company = db.get(Company, report.company_id)
    if company:
        if decision == "approved":
            company.monitoring_status = "active"  # Reset back to standard active monitoring
        elif decision == "rejected":
            company.monitoring_status = "active"
            company.risk_level = "low"  # Analyst dismissed high risk

    # Insert Human Review audit entry
    review = HumanReview(
        id=uuid.uuid4(),
        company_id=report.company_id,
        monitoring_run_id=report.monitoring_run_id,
        decision=decision,
        notes=f"Review decision '{decision}' submitted by human compliance analyst.",
        reviewed_at=datetime.now(UTC)
    )
    db.add(review)

    # Log action
    audit = AuditLog(
        id=uuid.uuid4(),
        actor="reviewer",
        action="submit_review",
        resource_type="sar_report",
        resource_id=str(report.id),
        event_metadata={"decision": decision}
    )
    db.add(audit)

    db.commit()
    db.refresh(report)
    return _serialize(report)
