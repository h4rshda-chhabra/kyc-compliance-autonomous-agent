from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company
from app.schemas import CompanyCreate
from app.services.company_directory import DirectoryCompany, list_companies
from app.services.company_directory import get_company as get_directory_company
import uuid

router = APIRouter(prefix="/companies", tags=["companies"])


def _serialize_scanned(company: Company) -> dict:
    return {
        "id": company.id,
        "legal_name": company.legal_name,
        "registration_number": company.registration_number,
        "jurisdiction": company.jurisdiction,
        "industry": company.industry,
        "monitoring_status": company.monitoring_status,
        "risk_level": company.risk_level,
        "onboarded_at": company.onboarded_at,
        "created_at": company.created_at,
        "updated_at": company.updated_at,
    }


def _serialize_directory(entity: DirectoryCompany) -> dict:
    """A dataset company that has never been scanned — no Postgres state yet."""
    return {
        "id": entity.id,
        "legal_name": entity.name,
        "registration_number": None,
        "jurisdiction": entity.countries,
        "industry": entity.source,
        "monitoring_status": "not_monitored",
        "risk_level": "unknown",
        "onboarded_at": None,
        "created_at": None,
        "updated_at": None,
    }


@router.get("")
def list_all_companies(q: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    directory = list_companies(query=q)

    scanned_query = db.query(Company)
    if q and q.strip():
        scanned_query = scanned_query.filter(Company.legal_name.ilike(f"%{q.strip()}%"))
    scanned = {c.id: c for c in scanned_query.all()}

    # Scanned companies first (they carry live risk state), then the rest of
    # the directory, skipping duplicates.
    result = [_serialize_scanned(c) for c in scanned.values()]
    result.extend(_serialize_directory(e) for e in directory if e.id not in scanned)
    return result


@router.get("/{company_id}")
def get_company(company_id: str, db: Session = Depends(get_db)) -> dict:
    company = db.get(Company, company_id)
    if company is not None:
        return _serialize_scanned(company)

    entity = get_directory_company(company_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return _serialize_directory(entity)


@router.post("")
def create_custom_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> dict:
    company_id = f"CUSTOM-{uuid.uuid4().hex[:8]}"
    company = Company(
        id=company_id,
        legal_name=payload.legal_name,
        jurisdiction=payload.jurisdiction,
        industry=payload.industry,
        monitoring_status="not_monitored",
        risk_level="unknown",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return _serialize_scanned(company)
