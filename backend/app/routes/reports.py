from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/companies/{company_id}/risk")
def get_risk_report(company_id: str) -> dict:
    return {"company_id": company_id, "risk_score": 0.0, "risk_level": "unknown", "rationale": ""}


@router.get("/companies/{company_id}/timeline")
def get_timeline(company_id: str) -> list:
    return []


@router.get("/companies/{company_id}/evidence")
def get_evidence(company_id: str) -> list:
    return []
