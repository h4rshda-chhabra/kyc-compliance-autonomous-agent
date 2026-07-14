from fastapi import APIRouter

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("")
def list_companies() -> list:
    return []


@router.get("/{company_id}")
def get_company(company_id: str) -> dict:
    return {"id": company_id, "legal_name": "", "monitoring_status": "unknown", "risk_level": "unknown"}
