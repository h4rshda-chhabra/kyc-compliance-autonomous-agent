from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.company import Company

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)) -> dict:
    total_companies = db.query(Company).count()
    active_monitoring = db.query(Company).filter(Company.monitoring_status == "monitored").count()
    escalated = db.query(Company).filter(Company.monitoring_status == "escalated").count()
    open_reviews = db.query(Company).filter(Company.monitoring_status == "review").count()

    return {
        "total_companies": total_companies,
        "active_monitoring": active_monitoring,
        "escalated": escalated,
        "open_reviews": open_reviews,
    }

