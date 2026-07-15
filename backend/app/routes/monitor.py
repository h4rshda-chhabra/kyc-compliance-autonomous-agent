import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, MonitoringRun
from app.services.company_directory import get_company as get_directory_company
from app.orchestrator.pipeline import run_company_audit

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
            # The sanctions dataset has no industry field — `entity.source` is the
            # sanctions list name (e.g. "OFAC SDN (CUBA)"), not an industry, so it
            # must not be mapped here. Leave unset; the SAR template falls back to "N/A".
            industry=None,
            monitoring_status="onboarding",
            risk_level="unknown",
            onboarded_at=datetime.now(UTC),
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    try:
        result = run_company_audit(company_id=company.id, db=db, trigger_type="manual")

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


@router.get("/sync/history")
def get_sync_history(db: Session = Depends(get_db)) -> list[dict]:
    from app.models.sanctions_sync_audit import SanctionsSyncAudit
    logs = db.query(SanctionsSyncAudit).order_by(SanctionsSyncAudit.sync_timestamp.desc()).all()
    return [
        {
            "id": str(log.id),
            "sync_timestamp": log.sync_timestamp,
            "provider": log.provider,
            "dataset_version": log.dataset_version,
            "records_added": log.records_added,
            "records_updated": log.records_updated,
            "records_removed": log.records_removed,
            "total_records": log.total_records,
            "sync_duration_seconds": log.sync_duration_seconds,
            "success": log.success,
            "failure_reason": log.failure_reason,
        }
        for log in logs
    ]


@router.post("/sync")
def trigger_sanctions_sync(feed_url: str | None = None) -> dict:
    from app.services.sync_sanctions import run_sanctions_sync
    result = run_sanctions_sync(feed_url=feed_url)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

