from fastapi import APIRouter

router = APIRouter(prefix="/monitor", tags=["monitor"])


@router.get("/runs")
def list_monitoring_runs() -> list:
    return []


@router.get("/runs/{run_id}")
def get_monitoring_run(run_id: str) -> dict:
    return {"id": run_id, "status": "unknown", "trigger_type": "unknown"}


@router.post("/companies/{company_id}/trigger")
def trigger_manual_run(company_id: str) -> dict:
    return {"id": "dummy-run-id", "company_id": company_id, "status": "queued"}
