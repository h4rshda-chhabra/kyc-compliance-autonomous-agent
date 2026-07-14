"""APScheduler wiring for the continuous monitoring sweep.

No jobs are registered yet — this module only owns the scheduler's
lifecycle (start/stop). Periodic jobs and the agent graph are added
in a later phase.
"""

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger("app.scheduler")

scheduler = BackgroundScheduler()


def start_scheduler() -> None:
    settings = get_settings()
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled via settings; skipping start.")
        return

    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started.")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
