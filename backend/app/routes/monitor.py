import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, MonitoringRun
from app.services.company_directory import get_company as get_directory_company
from app.orchestrator.orchestrator import AgentOrchestrator

router = APIRouter(prefix="/monitor", tags=["monitor"])


def _serialize(run: MonitoringRun, company_name: str | None = None) -> dict:
    return {
        "id": str(run.id),
        "company_id": run.company_id,
        "company_name": company_name,
        "trigger_type": run.trigger_type,
        "status": run.status,
        "summary": run.summary,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "created_at": run.created_at,
    }


@router.get("/runs")
def list_monitoring_runs(db: Session = Depends(get_db)) -> list[dict]:
    results = (
        db.query(MonitoringRun, Company.legal_name)
        .outerjoin(Company, MonitoringRun.company_id == Company.id)
        .order_by(MonitoringRun.created_at.desc())
        .all()
    )
    return [_serialize(run, company_name) for run, company_name in results]


@router.get("/runs/{run_id}")
def get_monitoring_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    run = db.get(MonitoringRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Monitoring run not found")
        
    company = db.get(Company, run.company_id)
    company_name = company.legal_name if company else None
    return _serialize(run, company_name)


@router.post("/companies/{company_id}/trigger")
def trigger_manual_run(company_id: str, db: Session = Depends(get_db)) -> dict:
    company = db.get(Company, company_id)
    if company is None:
        # First scan: materialize the company from the sanctions dataset directory.
        entity = get_directory_company(company_id)
        if entity is None:
            raise HTTPException(status_code=404, detail="Company not found")
        company = Company(
            id=entity.id,
            legal_name=entity.name,
            jurisdiction=entity.countries,
            industry=entity.source,
            monitoring_status="onboarding",
            risk_level="unknown",
            onboarded_at=datetime.now(UTC),
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    try:
        orchestrator = AgentOrchestrator(company_id=company.id, db=db)
        result = orchestrator.execute_audit()
        
        # Query the run to merge its details for any hook expecting a MonitoringRun
        run = db.get(MonitoringRun, uuid.UUID(result["run_id"]))
        if run:
            serialized_run = _serialize(run, company.legal_name)
            # Add the AuditResult keys directly to serialized_run
            serialized_run.update(result)
            return serialized_run
            
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
