import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.orchestrator.orchestrator import AgentOrchestrator

router = APIRouter(prefix="/monitor", tags=["monitor"])


from app.models.company import Company
from app.models.monitoring_run import MonitoringRun



@router.get("/runs")
def list_monitoring_runs(db: Session = Depends(get_db)) -> list:
    results = db.query(MonitoringRun, Company).join(Company, MonitoringRun.company_id == Company.id).order_by(MonitoringRun.started_at.desc()).all()
    return [
        {
            "id": str(run.id),
            "company_id": str(run.company_id),
            "company_name": comp.legal_name,
            "status": run.status,
            "trigger_type": run.trigger_type,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None
        } for run, comp in results
    ]



@router.get("/runs/{run_id}")
def get_monitoring_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    run = db.query(MonitoringRun).filter(MonitoringRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Monitoring run not found")
    return {
        "id": str(run.id),
        "company_id": str(run.company_id),
        "status": run.status,
        "trigger_type": run.trigger_type,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None
    }



@router.post("/companies/{company_id}/trigger")
def trigger_manual_run(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    try:
        orchestrator = AgentOrchestrator(company_id=company_id, db=db)
        result = orchestrator.execute_audit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
