// TypeScript mirrors of backend/app/models/*.py — kept in sync manually until
// a schema generator is wired up. No client-side logic here, types only.

export type UUID = string;
export type ISODateTime = string;

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Company {
  id: UUID;
  legal_name: string;
  registration_number: string | null;
  jurisdiction: string | null;
  industry: string | null;
  monitoring_status: string;
  risk_level: string;
  onboarded_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CompanyDirector {
  id: UUID;
  company_id: UUID;
  full_name: string;
  role_title: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  is_pep: boolean;
  created_at: ISODateTime;
}

export interface MonitoringRun {
  id: UUID;
  company_id: UUID;
  trigger_type: string;
  status: string;
  summary: string | null;
  started_at: ISODateTime | null;
  completed_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface NewsArticle {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  title: string;
  url: string;
  source: string | null;
  sentiment: string | null;
  published_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface SanctionMatch {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  list_name: string;
  matched_name: string;
  match_score: number;
  status: string;
  created_at: ISODateTime;
}

export interface WatchlistMatch {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  watchlist_name: string;
  matched_name: string;
  match_score: number;
  status: string;
  created_at: ISODateTime;
}

export interface Evidence {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  evidence_type: string;
  source_url: string | null;
  content: string | null;
  collected_at: ISODateTime;
}

export interface RiskReport {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  risk_score: number;
  risk_level: string;
  rationale: string | null;
  created_at: ISODateTime;
}

export interface TimelineEvent {
  id: UUID;
  company_id: UUID;
  event_type: string;
  description: string | null;
  occurred_at: ISODateTime;
  created_at: ISODateTime;
}

export interface SARReport {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  status: string;
  narrative: string | null;
  filed_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface HumanReview {
  id: UUID;
  company_id: UUID;
  monitoring_run_id: UUID | null;
  reviewer_id: UUID | null;
  decision: string | null;
  notes: string | null;
  reviewed_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface AuditLog {
  id: UUID;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  event_metadata: Record<string, unknown> | null;
  created_at: ISODateTime;
}
