"""APScheduler wiring for the continuous monitoring sweep.

Runs a recurring job that re-audits every already-onboarded company on a
fixed interval, so risk profiles stay current without a human clicking
"scan" — this is what makes monitoring "continuous" rather than on-demand.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import get_settings
from app.core.logging import get_logger
from app.database import SessionLocal
from app.models.company import Company

logger = get_logger("app.scheduler")

scheduler = BackgroundScheduler()

SWEEP_JOB_ID = "continuous_monitoring_sweep"


def run_monitoring_sweep() -> None:
    """Re-runs the audit for every company that has completed at least one scan.

    Companies still in "onboarding" (never scanned) are skipped — they only
    enter continuous monitoring once a first manual/onboarding run has run.
    Each company's run only turns into new evidence/timeline/SAR output if
    RiskChangeDetector finds a material change; otherwise it's just a
    recorded, no-op confirmation (see app.orchestrator.pipeline).
    """
    from app.orchestrator.pipeline import run_company_audit

    db = SessionLocal()
    try:
        companies = db.query(Company).filter(Company.monitoring_status != "onboarding").all()
        logger.info("Continuous monitoring sweep starting for %d company(ies).", len(companies))

        for company in companies:
            try:
                run_company_audit(company_id=company.id, db=db, trigger_type="scheduled")
            except Exception:
                logger.exception("Scheduled audit failed for company %s", company.id)
    finally:
        db.close()


def start_scheduler() -> None:
    settings = get_settings()
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled via settings; skipping start.")
        return

    if not scheduler.get_job(SWEEP_JOB_ID):
        scheduler.add_job(
            run_monitoring_sweep,
            trigger=IntervalTrigger(minutes=settings.monitoring_sweep_interval_minutes),
            id=SWEEP_JOB_ID,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    if not scheduler.running:
        scheduler.start()
        logger.info(
            "Scheduler started. Continuous monitoring sweep runs every %d minute(s).",
            settings.monitoring_sweep_interval_minutes,
        )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
