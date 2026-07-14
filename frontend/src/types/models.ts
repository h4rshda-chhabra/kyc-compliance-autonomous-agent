// Mirrors backend/app/models/*.py 1:1 (SQLAlchemy → JSON). IDs are UUIDs,
// serialized as strings. Statuses the backend leaves as free strings are
// typed as string here; known values are listed in the comments.

/** Backend default is "unknown"; scoring produces low/medium/high/critical. */
export type RiskLevel = "unknown" | "low" | "medium" | "high" | "critical";

export interface Company {
  /** OpenSanctions/OFAC entity id (e.g. "NK-...", "OFAC-36") — the company
   *  directory is served straight from the sanctions dataset. */
  id: string;
  legal_name: string;
  registration_number: string | null;
  jurisdiction: string | null;
  industry: string | null;
  /** e.g. "not_monitored" (directory only), "onboarding", "active", "escalated" */
  monitoring_status: string;
  risk_level: RiskLevel;
  onboarded_at: string | null;
  /** null until the company has been scanned (no Postgres row yet). */
  created_at: string | null;
  updated_at: string | null;
}

export interface MonitoringRun {
  id: string;
  company_id: string;
  /** e.g. "scheduled", "manual", "event_driven" */
  trigger_type: string;
  /** e.g. "queued" (default), "running", "completed", "failed" */
  status: string;
  summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RiskReport {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  rationale: string | null;
  created_at: string;
}

export interface HumanReview {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  reviewer_id: string | null;
  /** e.g. "approved", "rejected", "escalated" */
  decision: string | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface SARReport {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  /** e.g. "draft" (default), "pending_review", "approved", "rejected", "filed" */
  status: string;
  narrative: string | null;
  filed_at: string | null;
  created_at: string;
}

export interface Evidence {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  /** e.g. "news", "sanction", "registry", "court" */
  evidence_type: string;
  source_url: string | null;
  content: string | null;
  collected_at: string;
}

export interface TimelineEvent {
  id: string;
  company_id: string;
  event_type: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  event_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  /** e.g. "reviewer" (default), "admin" */
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Shape of GET /dashboard/summary (routes/dashboard.py). */
export interface DashboardSummary {
  total_companies: number;
  active_monitoring: number;
  escalated: number;
  open_reviews: number;
}

/** Shape of POST /auth/login (routes/auth.py). */
export interface LoginResponse {
  access_token: string;
  token_type: string;
}
