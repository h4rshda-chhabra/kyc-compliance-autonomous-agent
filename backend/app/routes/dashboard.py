from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, SARReport
from app.services.company_directory import count_companies

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)) -> dict:
    # Directory size comes straight from the sanctions dataset; the other
    # counts reflect live monitoring state in Postgres.
    total_companies = count_companies()
    active_monitoring = (
        db.query(func.count(Company.id))
        .filter(Company.monitoring_status == "active")
        .scalar()
        or 0
    )
    escalated = (
        db.query(func.count(Company.id))
        .filter(Company.monitoring_status == "escalated")
        .scalar()
        or 0
    )
    open_reviews = (
        db.query(func.count(SARReport.id))
        .filter(SARReport.status == "pending_review")
        .scalar()
        or 0
    )

    from app.config import get_settings
    settings = get_settings()

    return {
        "total_companies": total_companies,
        "active_monitoring": active_monitoring,
        "escalated": escalated,
        "open_reviews": open_reviews,
        "demo_mode": settings.demo_mode,
    }

