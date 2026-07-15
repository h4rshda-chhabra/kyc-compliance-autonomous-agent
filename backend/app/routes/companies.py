import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.company import Company

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("")
def list_companies(db: Session = Depends(get_db)) -> list:
    companies = db.query(Company).order_by(Company.legal_name).all()
    return [
        {
            "id": str(c.id),
            "legal_name": c.legal_name,
            "registration_number": c.registration_number,
            "jurisdiction": c.jurisdiction,
            "industry": c.industry,
            "monitoring_status": c.monitoring_status,
            "risk_level": c.risk_level,
            "onboarded_at": c.onboarded_at.isoformat() if c.onboarded_at else None,
            "created_at": c.created_at.isoformat()
        } for c in companies
    ]



@router.get("/{company_id}")
def get_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": str(company.id),
        "legal_name": company.legal_name,
        "registration_number": company.registration_number,
        "jurisdiction": company.jurisdiction,
        "industry": company.industry,
        "monitoring_status": company.monitoring_status,
        "risk_level": company.risk_level,
        "onboarded_at": company.onboarded_at.isoformat() if company.onboarded_at else None,
        "created_at": company.created_at.isoformat()
    }
