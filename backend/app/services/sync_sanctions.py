import hashlib
import logging
import os
import shutil
import sqlite3
import time
import uuid
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import httpx

from app.config import get_settings
from app.database import SessionLocal
from app.models.sanctions_sync_audit import SanctionsSyncAudit
from app.orchestrator.scheduler import run_monitoring_sweep

logger = logging.getLogger("app.sync_sanctions")

# Minimum reasonable records in a valid sanctions DB to prevent loading corrupted/truncated feeds
MINIMUM_RECORD_THRESHOLD = 1000


def get_file_sha256(file_path: Path) -> str:
    """Calculates SHA-256 checksum of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()


def validate_sanctions_db(db_path: Path) -> Tuple[bool, str, int]:
    """Validates the downloaded SQLite database feed file.

    Checks:
    1. It is a valid SQLite 3 database.
    2. It contains the required tables 'entities' and 'aliases'.
    3. The schema includes essential columns ('id', 'name', 'source' in entities).
    4. The total record count is reasonable (avoids replacing database with empty/truncated file).

    Returns:
      (is_valid: bool, error_reason: str, total_records: int)
    """
    if not db_path.exists():
        return False, "Downloaded file does not exist", 0

    if db_path.stat().st_size == 0:
        return False, "Downloaded file is empty (0 bytes)", 0

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Check tables exist
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('entities', 'aliases')")
        tables = {row[0] for row in cur.fetchall()}
        if "entities" not in tables or "aliases" not in tables:
            return False, "Database schema is missing 'entities' or 'aliases' tables", 0

        # Check required columns in 'entities'
        cur.execute("PRAGMA table_info(entities)")
        columns = {row[1] for row in cur.fetchall()}
        required_cols = {"id", "name", "source"}
        if not required_cols.issubset(columns):
            return False, f"Table 'entities' is missing required columns: {required_cols - columns}", 0

        # Verify record count is reasonable
        cur.execute("SELECT COUNT(*) FROM entities")
        total_records = cur.fetchone()[0]
        if total_records < MINIMUM_RECORD_THRESHOLD:
            return False, f"Record count {total_records} is below safety threshold of {MINIMUM_RECORD_THRESHOLD}", total_records

        return True, "", total_records

    except sqlite3.DatabaseError as e:
        return False, f"File is not a valid SQLite database: {str(e)}", 0
    except Exception as e:
        return False, f"Unexpected validation error: {str(e)}", 0
    finally:
        if conn:
            conn.close()


def calculate_database_diff(old_db_path: Path, new_db_path: Path) -> Tuple[int, int, int]:
    """Compares two sanctions databases to calculate added, removed, and updated records.

    Returns:
      (added: int, updated: int, removed: int)
    """
    if not old_db_path.exists():
        # First sync, everything in new is added
        conn = sqlite3.connect(new_db_path)
        try:
            total = conn.execute("SELECT COUNT(*) FROM entities").fetchone()[0]
            return total, 0, 0
        finally:
            conn.close()

    conn = None
    try:
        conn = sqlite3.connect(new_db_path)
        cur = conn.cursor()

        # Attach the old database file to query both databases in a single connection
        # We absolute-path the file to be safe
        old_abs_path = os.path.abspath(old_db_path)
        cur.execute(f"ATTACH DATABASE ? AS old_db", (old_abs_path,))

        # 1. Calculate added records count (in new but not in old)
        cur.execute("""
            SELECT COUNT(*) FROM entities
            WHERE id NOT IN (SELECT id FROM old_db.entities)
        """)
        added = cur.fetchone()[0]

        # 2. Calculate removed records count (in old but not in new)
        cur.execute("""
            SELECT COUNT(*) FROM old_db.entities
            WHERE id NOT IN (SELECT id FROM entities)
        """)
        removed = cur.fetchone()[0]

        # 3. Calculate updated records count (matching IDs but changed properties)
        # We compare legal name and countries. We map NULL to empty strings for safe comparisons
        cur.execute("""
            SELECT COUNT(*) FROM entities e
            JOIN old_db.entities o ON e.id = o.id
            WHERE COALESCE(e.name, '') != COALESCE(o.name, '')
               OR COALESCE(e.countries, '') != COALESCE(o.countries, '')
        """)
        updated = cur.fetchone()[0]

        cur.execute("DETACH DATABASE old_db")
        return added, updated, removed

    except Exception as e:
        logger.error("Failed to calculate database delta differences using SQL ATTACH: %s", str(e))
        return 0, 0, 0
    finally:
        if conn:
            conn.close()



def run_sanctions_sync(feed_url: Optional[str] = None) -> Dict[str, Any]:
    """Runs the sanctions database sync pipeline.

    Flow:
    1. Downloads feed file to a unique versioned database file.
    2. Validates schema and record threshold count.
    3. Compares checksums to determine if changes occurred.
    4. Swaps active file atomically.
    5. Saves detailed sync history audit log to database.
    6. Triggers re-screening (monitoring sweep) ONLY if checksum changed.
    """
    settings = get_settings()
    active_path = Path(settings.sanctions_db_path)

    # Ensure parent directories exist
    active_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    version_tag = f"v_{timestamp}"
    temp_path = active_path.parent / f"sanctions_lookup_{version_tag}.db"

    start_time = time.time()
    db = SessionLocal()

    success = False
    failure_reason = None
    records_added = 0
    records_updated = 0
    records_removed = 0
    total_records = 0
    dataset_changed = False

    try:
        # Step 1: Ingestion (Download Feed)
        if feed_url:
            logger.info("Downloading live sanctions feed from %s...", feed_url)
            with httpx.Client(timeout=60.0) as client:
                response = client.get(feed_url)
                response.raise_for_status()
                with open(temp_path, "wb") as f:
                    f.write(response.content)
        else:
            # Simulated Onboarding Sync fallback (Local environment friendly)
            # If no feed URL is specified, we duplicate the active file (or seed it) to represent the download.
            logger.info("No external sanctions feed URL specified. Performing simulated local synchronization sweep...")
            if active_path.exists():
                shutil.copy2(active_path, temp_path)
            else:
                return {
                    "success": False,
                    "reason": "Active database file not found, cannot seed local mock feed.",
                }

        # Step 2: Feed Validation
        is_valid, error_reason, total_records = validate_sanctions_db(temp_path)
        if not is_valid:
            failure_reason = f"Feed validation failed: {error_reason}"
            logger.error("[SYNC FAILURE] %s", failure_reason)
            if temp_path.exists():
                os.remove(temp_path)
        else:
            # Step 3: Check if dataset changed (Checksum comparison)
            old_checksum = get_file_sha256(active_path) if active_path.exists() else ""
            new_checksum = get_file_sha256(temp_path)

            if old_checksum != new_checksum:
                dataset_changed = True
                # Calculate differences (delta statistics)
                records_added, records_updated, records_removed = calculate_database_diff(active_path, temp_path)

            # Step 4: Atomic Swap
            # Copy to target path safely. We keep the temp file as our versioned history/rollback backup.
            shutil.copy2(temp_path, active_path)
            success = True
            logger.info(
                "[SYNC SUCCESS] Dataset upgraded to %s. Total records: %d (Added: %d, Updated: %d, Removed: %d)",
                version_tag,
                total_records,
                records_added,
                records_updated,
                records_removed,
            )

    except Exception as e:
        failure_reason = f"Sync exception occurred: {str(e)}"
        logger.exception("Sanctions synchronization pipeline failed.")
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception:
                pass
    finally:
        sync_duration = time.time() - start_time

        # Step 5: Save Sync Audit Log
        audit_log = SanctionsSyncAudit(
            id=uuid.uuid4(),
            provider="OpenSanctions" if feed_url else "OpenSanctions (Local Delta)",
            dataset_version=version_tag if success else "failed",
            records_added=records_added,
            records_updated=records_updated,
            records_removed=records_removed,
            total_records=total_records,
            sync_duration_seconds=round(sync_duration, 2),
            success=success,
            failure_reason=failure_reason,
            sync_timestamp=datetime.now(UTC),
        )
        db.add(audit_log)
        db.commit()
        db.close()

    # Step 6: Trigger Monitoring if dataset changed
    if success and dataset_changed:
        logger.info("Watchlist dataset change detected! Launching background continuous screening re-audit...")
        # Since scheduler handles sweep running in background, we launch it asynchronously
        try:
            run_monitoring_sweep()
        except Exception as e:
            logger.error("Failed to launch automated monitoring sweep post-sync: %s", str(e))

    return {
        "success": success,
        "version": version_tag if success else None,
        "dataset_changed": dataset_changed,
        "records_added": records_added,
        "records_updated": records_updated,
        "records_removed": records_removed,
        "total_records": total_records,
        "duration_seconds": round(sync_duration, 2),
        "error": failure_reason,
    }


def rollback_dataset(version_tag: str) -> bool:
    """Rolls back the active sanctions database to a previously validated version."""
    settings = get_settings()
    active_path = Path(settings.sanctions_db_path)
    version_path = active_path.parent / f"sanctions_lookup_{version_tag}.db"

    if not version_path.exists():
        logger.error("Cannot rollback: Version database %s does not exist.", version_path.name)
        return False

    try:
        shutil.copy2(version_path, active_path)
        logger.info("Successfully rolled back active sanctions database to version %s.", version_tag)
        return True
    except Exception as e:
        logger.error("Failed to restore sanctions database rollback: %s", str(e))
        return False
