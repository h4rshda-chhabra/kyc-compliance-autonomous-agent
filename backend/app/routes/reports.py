from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Evidence, RiskReport, TimelineEvent

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/companies/{company_id}/risk")
def get_risk_report(company_id: str, db: Session = Depends(get_db)) -> dict:
    report = (
        db.query(RiskReport)
        .filter(RiskReport.company_id == company_id)
        .order_by(RiskReport.created_at.desc())
        .first()
    )
    if report is None:
        return {
            "company_id": company_id,
            "risk_score": 0.0,
            "risk_level": "unknown",
            "rationale": None,
        }

    return {
        "id": str(report.id),
        "company_id": report.company_id,
        "monitoring_run_id": str(report.monitoring_run_id) if report.monitoring_run_id else None,
        "risk_score": report.risk_score,
        "risk_level": report.risk_level,
        "rationale": report.rationale,
        "created_at": report.created_at,
    }


@router.get("/companies/{company_id}/timeline")
def get_timeline(company_id: str, db: Session = Depends(get_db)) -> list[dict]:
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.company_id == company_id)
        .order_by(TimelineEvent.occurred_at.desc())
        .all()
    )
    return [
        {
            "id": str(e.id),
            "company_id": e.company_id,
            "event_type": e.event_type,
            "description": e.description,
            "occurred_at": e.occurred_at,
            "created_at": e.created_at,
        }
        for e in events
    ]


@router.get("/companies/{company_id}/evidence")
def get_evidence(company_id: str, db: Session = Depends(get_db)) -> list[dict]:
    items = (
        db.query(Evidence)
        .filter(Evidence.company_id == company_id)
        .order_by(Evidence.collected_at.desc())
        .all()
    )
    return [
        {
            "id": str(e.id),
            "company_id": e.company_id,
            "monitoring_run_id": str(e.monitoring_run_id) if e.monitoring_run_id else None,
            "evidence_type": e.evidence_type,
            "source_url": e.source_url,
            "content": e.content,
            "collected_at": e.collected_at,
        }
        for e in items
    ]
