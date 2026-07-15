import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.risk_report import RiskReport
from app.models.timeline_event import TimelineEvent
from app.models.evidence import Evidence

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/companies/{company_id}/risk")
def get_risk_report(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    report = db.query(RiskReport).filter(RiskReport.company_id == company_id).order_by(RiskReport.created_at.desc()).first()
    if not report:
        return {"company_id": str(company_id), "risk_score": 0.0, "risk_level": "unknown", "rationale": "No risk assessment completed yet."}
    return {
        "company_id": str(report.company_id),
        "risk_score": report.risk_score,
        "risk_level": report.risk_level,
        "rationale": report.rationale,
        "created_at": report.created_at.isoformat()
    }


@router.get("/companies/{company_id}/timeline")
def get_timeline(company_id: uuid.UUID, db: Session = Depends(get_db)) -> list:
    events = db.query(TimelineEvent).filter(TimelineEvent.company_id == company_id).order_by(TimelineEvent.occurred_at.asc()).all()
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "description": e.description,
            "occurred_at": e.occurred_at.isoformat()
        } for e in events
    ]


@router.get("/companies/{company_id}/evidence")
def get_evidence(company_id: uuid.UUID, db: Session = Depends(get_db)) -> list:
    evidence_list = db.query(Evidence).filter(Evidence.company_id == company_id).all()
    return [
        {
            "id": str(e.id),
            "evidence_type": e.evidence_type,
            "source_url": e.source_url,
            "content": e.content,
            "collected_at": e.collected_at.isoformat()
        } for e in evidence_list
    ]

