import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def list_audit_logs(db: Session = Depends(get_db)) -> list:
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    return [
        {
            "id": str(log.id),
            "actor": log.actor,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "event_metadata": log.event_metadata,
            "created_at": log.created_at.isoformat()
        } for log in logs
    ]


@router.get("/logs/{log_id}")
def get_audit_log(log_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return {
        "id": str(log.id),
        "actor": log.actor,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "event_metadata": log.event_metadata,
        "created_at": log.created_at.isoformat()
    }

