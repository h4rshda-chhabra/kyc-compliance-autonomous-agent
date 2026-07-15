"""Decides whether a fresh audit represents a *material* risk change.

Kept deliberately separate from AgentOrchestrator: the orchestrator's job is
to collect evidence and calculate a risk reading, not to judge whether that
reading is worth alerting a human about. RiskChangeDetector.compare() is the
single place that policy lives, so scheduled sweeps and manual re-checks are
judged by the same rules.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models.company_audit_state import CompanyAuditState
from app.orchestrator.audit_result import AuditResult

_RISK_RANK = {"low": 0, "medium": 1, "high": 2}

# Net-new adverse media articles in a single run before it's considered material on its own.
ADVERSE_MEDIA_INCREASE_THRESHOLD = 2

# Minimum jump in entity-resolution confidence (0-100 scale) before it's considered
# material on its own, even when the risk bucket and sanction list haven't changed.
ENTITY_CONFIDENCE_INCREASE_THRESHOLD = 15.0


@dataclass
class ChangeResult:
    material_change: bool
    change_type: Optional[str]
    change_summary: Optional[str]
    old_values: Dict[str, Any]
    new_values: Dict[str, Any]


class RiskChangeDetector:
    """Stateless comparison service: compare(previous_state, current) -> ChangeResult."""

    def compare(self, previous_state: Optional[CompanyAuditState], current: AuditResult) -> ChangeResult:
        previous_risk_level = previous_state.last_risk_level if previous_state else "unknown"
        previous_sanction_ids = set(previous_state.last_sanction_ids) if previous_state else set()
        previous_sanction_count = previous_state.last_sanction_count if previous_state else 0
        previous_news_count = previous_state.last_news_count if previous_state else 0
        previous_entity_confidence = previous_state.last_entity_confidence if previous_state else 0.0

        current_sanction_ids = set(current.sanction_ids)

        old_values = {
            "risk_level": previous_risk_level,
            "sanction_count": previous_sanction_count,
            "sanction_ids": sorted(previous_sanction_ids),
            "news_count": previous_news_count,
            "entity_confidence": previous_entity_confidence,
        }
        new_values = {
            "risk_level": current.risk_level,
            "sanction_count": len(current_sanction_ids),
            "sanction_ids": sorted(current_sanction_ids),
            "news_count": current.news_count,
            "entity_confidence": current.entity_confidence,
        }

        reasons: List[Dict[str, str]] = []

        # 1. First sanctions match / new sanctions hit beyond what was already known.
        newly_seen_ids = current_sanction_ids - previous_sanction_ids
        if newly_seen_ids:
            if previous_sanction_count == 0:
                reasons.append({
                    "type": "first_sanctions_match",
                    "summary": f"First sanctions match detected ({len(newly_seen_ids)} hit(s)).",
                })
            else:
                reasons.append({
                    "type": "new_sanctions_hit",
                    "summary": (
                        f"New sanctions list match(es) detected beyond the "
                        f"previously known {previous_sanction_count}."
                    ),
                })

        # 2. Risk level escalation — only meaningful once we have a real prior reading,
        # so a clean first-ever scan doesn't spuriously count as an "escalation".
        if (
            previous_risk_level in _RISK_RANK
            and current.risk_level in _RISK_RANK
            and _RISK_RANK[current.risk_level] > _RISK_RANK[previous_risk_level]
        ):
            reasons.append({
                "type": "risk_escalation",
                "summary": f"Risk escalated from {previous_risk_level.upper()} to {current.risk_level.upper()}.",
            })

        # 3. Significant adverse media increase since the last audit.
        news_delta = current.news_count - previous_news_count
        if news_delta >= ADVERSE_MEDIA_INCREASE_THRESHOLD:
            reasons.append({
                "type": "adverse_media_increase",
                "summary": f"{news_delta} new adverse media article(s) detected since the last audit.",
            })

        # 4. Significant increase in entity-resolution confidence, even without a
        # change in the risk bucket or sanction list (e.g. a fuzzy match firms up).
        confidence_delta = current.entity_confidence - previous_entity_confidence
        if confidence_delta >= ENTITY_CONFIDENCE_INCREASE_THRESHOLD:
            reasons.append({
                "type": "entity_confidence_increase",
                "summary": (
                    f"Entity-match confidence increased by {confidence_delta:.1f} points "
                    f"(now {current.entity_confidence:.1f}%)."
                ),
            })

        material_change = bool(reasons)
        return ChangeResult(
            material_change=material_change,
            change_type=reasons[0]["type"] if reasons else None,
            change_summary=" ".join(r["summary"] for r in reasons) if reasons else None,
            old_values=old_values,
            new_values=new_values,
        )
