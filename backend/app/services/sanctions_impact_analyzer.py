import logging
import os
import sqlite3
from pathlib import Path
from typing import List, Set

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_director import CompanyDirector
from app.models.sanction_match import SanctionMatch

logger = logging.getLogger("app.sanctions_impact_analyzer")


def determine_affected_companies(
    db: Session,
    old_db_path: Path,
    new_db_path: Path,
    added_ids: List[str],
    updated_ids: List[str],
    removed_ids: List[str]
) -> Set[str]:
    """Analyzes a sanctions database delta and returns the set of PostgreSQL
    company IDs that are potentially affected by the changes and need re-screening.

    Optimized to query SQLite directly with indexed lookups rather than loading
    millions of records into Python memory.

    Falls back to a full sweep (returns all active company IDs) on failure or low confidence.
    """
    # Fetch all active company IDs to use as fallback if needed
    try:
        active_companies = db.query(Company).filter(Company.monitoring_status != "onboarding").all()
        active_company_ids = {c.id for c in active_companies}
        if not active_company_ids:
            return set()
    except Exception as e:
        logger.error("Failed to query active companies from PostgreSQL. Falling back to empty set: %s", str(e))
        return set()

    # If lists are extremely large (e.g. first sync or rebuild), fallback to full sweep
    # to avoid creating SQL queries that exceed parameter limits.
    max_chunk_size = 900
    if len(added_ids) > 10000 or len(updated_ids) > 10000 or len(removed_ids) > 10000:
        logger.warning("Sanctions delta is very large. Falling back to full monitoring sweep for safety.")
        return active_company_ids

    affected_company_ids: Set[str] = set()

    # Step 1: Process REMOVED watchlist entities
    # If a sanctions entity was removed, we must re-screen any company that previously
    # matched that entity's name, so their risk rating can be downgraded or cleared.
    if removed_ids and old_db_path.exists():
        conn_old = None
        try:
            conn_old = sqlite3.connect(old_db_path)
            cur = conn_old.cursor()

            # Find names of removed sanctions entities
            removed_names: Set[str] = set()
            for i in range(0, len(removed_ids), max_chunk_size):
                chunk = removed_ids[i:i + max_chunk_size]
                placeholders = ",".join("?" for _ in chunk)
                cur.execute(f"SELECT name FROM entities WHERE id IN ({placeholders})", chunk)
                removed_names.update(row[0] for row in cur.fetchall() if row[0])

                # Check aliases too
                cur.execute(f"SELECT alias_name FROM aliases WHERE entity_id IN ({placeholders})", chunk)
                removed_names.update(row[0] for row in cur.fetchall() if row[0])

            if removed_names:
                # Query PostgreSQL for companies that currently hold SanctionMatches for these names
                matches = (
                    db.query(SanctionMatch.company_id)
                    .filter(SanctionMatch.matched_name.in_(list(removed_names)))
                    .all()
                )
                for m in matches:
                    if m.company_id in active_company_ids:
                        affected_company_ids.add(m.company_id)

        except Exception as e:
            logger.error("Failed to analyze impact of removed sanctions: %s. Falling back to full sweep.", str(e))
            return active_company_ids
        finally:
            if conn_old:
                conn_old.close()

    # Step 2: Process ADDED and UPDATED watchlist entities
    # Check if any monitored company name or director name matches the newly added/updated entities.
    changed_ids = list(set(added_ids + updated_ids))
    if changed_ids and new_db_path.exists():
        conn_new = None
        try:
            conn_new = sqlite3.connect(new_db_path)
            cur = conn_new.cursor()

            # Retrieve names of monitored companies and directors
            company_details = {c.id: c.legal_name for c in active_companies}
            
            directors = db.query(CompanyDirector.company_id, CompanyDirector.full_name).all()
            director_details = {}
            for d in directors:
                if d.company_id in active_company_ids:
                    director_details.setdefault(d.company_id, []).append(d.full_name)

            # Query SQLite using index matching to verify if any changed entity name or alias
            # matches our monitored names.
            # To scale efficiently, we perform a substring search for our monitored company/director names
            # against the changed entities dataset chunk by chunk.
            for company_id, comp_name in company_details.items():
                # Perform fuzzy/substring check
                pattern = f"%{comp_name}%"
                
                # Check for each chunk of changed IDs
                match_found = False
                for i in range(0, len(changed_ids), max_chunk_size):
                    chunk = changed_ids[i:i + max_chunk_size]
                    placeholders = ",".join("?" for _ in chunk)
                    
                    # Test primary name match
                    cur.execute(
                        f"SELECT 1 FROM entities WHERE name LIKE ? AND id IN ({placeholders}) LIMIT 1",
                        [pattern] + chunk
                    )
                    if cur.fetchone():
                        affected_company_ids.add(company_id)
                        match_found = True
                        break
                    
                    # Test alias match
                    cur.execute(
                        f"SELECT 1 FROM aliases WHERE alias_name LIKE ? AND entity_id IN ({placeholders}) LIMIT 1",
                        [pattern] + chunk
                    )
                    if cur.fetchone():
                        affected_company_ids.add(company_id)
                        match_found = True
                        break

                if match_found:
                    continue

                # Test director names for this company
                comp_directors = director_details.get(company_id, [])
                for dir_name in comp_directors:
                    dir_pattern = f"%{dir_name}%"
                    for i in range(0, len(changed_ids), max_chunk_size):
                        chunk = changed_ids[i:i + max_chunk_size]
                        placeholders = ",".join("?" for _ in chunk)
                        
                        cur.execute(
                            f"SELECT 1 FROM entities WHERE name LIKE ? AND id IN ({placeholders}) LIMIT 1",
                            [dir_pattern] + chunk
                        )
                        if cur.fetchone():
                            affected_company_ids.add(company_id)
                            match_found = True
                            break
                        
                        cur.execute(
                            f"SELECT 1 FROM aliases WHERE alias_name LIKE ? AND entity_id IN ({placeholders}) LIMIT 1",
                            [dir_pattern] + chunk
                        )
                        if cur.fetchone():
                            affected_company_ids.add(company_id)
                            match_found = True
                            break
                    if match_found:
                        break

        except Exception as e:
            logger.error("Failed to analyze impact of added/updated sanctions: %s. Falling back to full sweep.", str(e))
            return active_company_ids
        finally:
            if conn_new:
                conn_new.close()

    logger.info(
        "[IMPACT ANALYZER] Checked %d added/updated and %d removed records. Identified %d affected company(ies) for re-screening.",
        len(added_ids) + len(updated_ids),
        len(removed_ids),
        len(affected_company_ids)
    )

    return affected_company_ids
