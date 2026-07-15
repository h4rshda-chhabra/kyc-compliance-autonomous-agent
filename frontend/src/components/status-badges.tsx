import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/models";

// Backend statuses are free-form strings; badges style the known values and
// fall back to a neutral outline for anything unexpected.

const neutral = "bg-muted text-muted-foreground border-border";
const emerald =
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
const amber =
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
const orange =
  "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
const red =
  "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
const blue =
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";

function StatusBadge({
  value,
  styles,
}: {
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <Badge variant="outline" className={cn("capitalize", styles[value] ?? neutral)}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

const riskStyles: Record<RiskLevel, string> = {
  unknown: neutral,
  low: emerald,
  medium: amber,
  high: orange,
  critical: red,
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <StatusBadge value={level} styles={riskStyles} />;
}

const lifecycleStyles: Record<string, string> = {
  onboarding: blue,
  "under monitoring": emerald,
  deactivated: neutral,
};

/** Collapses monitoring_status + is_active into exactly the three states a
 *  compliance officer or admin actually cares about — never risk level, and
 *  never Active/Inactive wording (that's reserved for the deactivation
 *  lifecycle, not risk). Risk is always shown separately via RiskBadge. */
export function monitoringLifecycleLabel(company: {
  monitoring_status: string;
  is_active: boolean;
}): "Onboarding" | "Under Monitoring" | "Deactivated" {
  if (!company.is_active) return "Deactivated";
  if (company.monitoring_status === "onboarding" || company.monitoring_status === "not_monitored") {
    return "Onboarding";
  }
  return "Under Monitoring";
}

export function MonitoringLifecycleBadge({
  company,
}: {
  company: { monitoring_status: string; is_active: boolean };
}) {
  const label = monitoringLifecycleLabel(company);
  return (
    <Badge variant="outline" className={lifecycleStyles[label.toLowerCase()] ?? neutral}>
      {label}
    </Badge>
  );
}

const runStatusStyles: Record<string, string> = {
  queued: neutral,
  pending: neutral,
  running: blue,
  completed: emerald,
  failed: red,
};

export function RunStatusBadge({ status }: { status: string }) {
  return <StatusBadge value={status} styles={runStatusStyles} />;
}

const sarStatusStyles: Record<string, string> = {
  draft: neutral,
  pending_review: amber,
  approved: emerald,
  rejected: red,
  filed: emerald,
  reviewed: emerald,
};

export function SarStatusBadge({ status }: { status: string }) {
  return <StatusBadge value={status} styles={sarStatusStyles} />;
}

// Draft SARs are the ones sitting in the reviewer's queue awaiting action —
// call that out since the neutral "draft" badge alone reads as inert, not actionable.
export function NeedsReviewPulse({ status }: { status: string }) {
  if (status !== "draft") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
      </span>
      Needs review
    </span>
  );
}

const decisionStyles: Record<string, string> = {
  pending: neutral,
  approved: emerald,
  rejected: red,
  escalated: orange,
};

export function ReviewDecisionBadge({ decision }: { decision: string }) {
  return <StatusBadge value={decision} styles={decisionStyles} />;
}
