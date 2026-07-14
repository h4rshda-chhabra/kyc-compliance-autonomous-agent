from fastapi import APIRouter

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/sar")
def list_sar_reports() -> list:
    return []


@router.get("/sar/{sar_id}")
def get_sar_report(sar_id: str) -> dict:
    return {"id": sar_id, "status": "draft", "narrative": ""}


@router.post("/sar/{sar_id}/decision")
def submit_review_decision(sar_id: str) -> dict:
    return {"id": sar_id, "status": "reviewed"}
