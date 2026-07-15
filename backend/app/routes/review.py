import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.sar_report import SARReport
from app.models.company import Company
from app.models.human_review import HumanReview
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/sar")
def list_sar_reports(db: Session = Depends(get_db)) -> list:
    results = db.query(SARReport, Company).join(Company, SARReport.company_id == Company.id).all()
    return [
        {
            "id": str(sar.id),
            "company_id": str(sar.company_id),
            "company_name": comp.legal_name,
            "status": sar.status,
            "narrative": sar.narrative,
            "created_at": sar.created_at.isoformat()
        } for sar, comp in results
    ]


@router.get("/sar/{sar_id}")
def get_sar_report(sar_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    result = db.query(SARReport, Company).join(Company, SARReport.company_id == Company.id).filter(SARReport.id == sar_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="SAR Report not found")
    sar, comp = result
    return {
        "id": str(sar.id),
        "company_id": str(sar.company_id),
        "company_name": comp.legal_name,
        "status": sar.status,
        "narrative": sar.narrative,
        "created_at": sar.created_at.isoformat()
    }


@router.post("/sar/{sar_id}/decision")
def submit_review_decision(
    sar_id: uuid.UUID,
    decision: str = Query("filed", description="Decision to apply: filed or dismissed"),
    db: Session = Depends(get_db)
) -> dict:
    sar = db.query(SARReport).filter(SARReport.id == sar_id).first()
    if not sar:
        raise HTTPException(status_code=404, detail="SAR Report not found")

    # Update SAR status
    sar.status = decision

    # Find and update corresponding company risk/monitoring status
    company = db.query(Company).filter(Company.id == sar.company_id).first()
    if company:
        if decision == "filed":
            company.monitoring_status = "monitored"  # Reset back to standard monitoring
        elif decision == "dismissed":
            company.monitoring_status = "monitored"
            company.risk_level = "low"  # Analyst dismissed high risk

    # Insert Human Review audit entry
    review = HumanReview(
        id=uuid.uuid4(),
        company_id=sar.company_id,
        monitoring_run_id=sar.monitoring_run_id,
        decision=decision,
        notes=f"Review decision '{decision}' submitted by human compliance analyst.",
        reviewed_at=datetime.utcnow()
    )
    db.add(review)

    # Log action
    audit = AuditLog(
        id=uuid.uuid4(),
        actor="reviewer",
        action="submit_review",
        resource_type="sar_report",
        resource_id=str(sar.id),
        event_metadata={"decision": decision}
    )
    db.add(audit)

    db.commit()
    return {"id": str(sar.id), "status": sar.status}

