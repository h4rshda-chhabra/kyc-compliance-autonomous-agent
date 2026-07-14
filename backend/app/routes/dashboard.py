from fastapi import APIRouter

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary() -> dict:
    return {
        "total_companies": 0,
        "active_monitoring": 0,
        "escalated": 0,
        "open_reviews": 0,
    }
