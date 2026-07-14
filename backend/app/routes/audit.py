from fastapi import APIRouter

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def list_audit_logs() -> list:
    return []


@router.get("/logs/{log_id}")
def get_audit_log(log_id: str) -> dict:
    return {"id": log_id, "actor": "", "action": "", "resource_type": ""}
