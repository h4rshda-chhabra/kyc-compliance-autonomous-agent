import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileText,
  Hash,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { CompanyStatusBadge, NeedsReviewPulse, RiskBadge, SarStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { useCompany, useUpdateCompanyCadence } from "@/hooks/useCompanies";
import { useCompanyEvidence, useCompanyRiskReport, useCompanyTimeline } from "@/hooks/useReports";
import { useTriggerMonitoringRun } from "@/hooks/useMonitoringRuns";
import { useSarReports } from "@/hooks/useSarReports";
import { previewLines } from "@/lib/utils";


function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ companyId }: { companyId: string }) {
  const { data: company } = useCompany(companyId);
  const { data: riskReport, isLoading: riskLoading } = useCompanyRiskReport(companyId);
  const updateCadence = useUpdateCompanyCadence();

  if (!company) return null;

  const hasAssessment = riskReport && riskReport.risk_level !== "unknown";

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCadence.mutate({
      companyId,
      news_monitoring_enabled: e.target.checked,
    });
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCadence.mutate({
      companyId,
      news_monitoring_interval_minutes: parseInt(e.target.value, 10),
    });
  };

  // Calculate next check time
  let nextCheckStr = "—";
  if (company.news_monitoring_enabled) {
    if (company.last_news_check_at) {
      const lastCheck = new Date(company.last_news_check_at);
      const nextCheck = new Date(lastCheck.getTime() + (company.news_monitoring_interval_minutes || 1440) * 60000);
      nextCheckStr = nextCheck.toLocaleString();
    } else {
      nextCheckStr = "Pending first scan";
    }
  } else {
    nextCheckStr = "Monitoring disabled";
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={Hash} label="Registration number" value={company.registration_number || "—"} />
            <DetailRow icon={MapPin} label="Jurisdiction" value={company.jurisdiction || "—"} />
            <DetailRow icon={Building2} label="Industry" value={company.industry || "—"} />
            <DetailRow
              icon={CalendarClock}
              label="Onboarded"
              value={company.onboarded_at ? new Date(company.onboarded_at).toLocaleDateString() : "—"}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="mx-auto h-32 w-56" />
            ) : hasAssessment ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
                <RiskGauge score={riskReport.risk_score} />
                {riskReport.rationale ? (
                  <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {riskReport.rationale}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No risk assessment yet"
                description="A risk score appears here once monitoring has run for this company."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Continuous Monitoring Cadence Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="flex items-center gap-3 space-x-2 rounded-md border p-4">
            <input
              type="checkbox"
              id="news-monitor-toggle"
              checked={company.news_monitoring_enabled ?? true}
              onChange={handleEnabledChange}
              disabled={updateCadence.isPending}
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="news-monitor-toggle"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Enable News Monitoring
              </label>
              <p className="text-xs text-muted-foreground">
                Run background audits periodically for this company.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Audit Frequency Interval</label>
            <select
              value={company.news_monitoring_interval_minutes ?? 1440}
              onChange={handleIntervalChange}
              disabled={!(company.news_monitoring_enabled ?? true) || updateCadence.isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="15">15 Minutes (Immediate High-Risk Suspect)</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour (Medium Risk Standard)</option>
              <option value="360">6 Hours</option>
              <option value="720">12 Hours</option>
              <option value="1440">24 Hours (Low Risk Standard)</option>
            </select>
          </div>

          <div className="rounded-md border p-4 space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Last Evaluated:</span>
              <div className="text-sm font-semibold text-foreground">
                {company.last_news_check_at ? new Date(company.last_news_check_at).toLocaleString() : "Never checked"}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Estimated Next Scan:</span>
              <div className="text-sm font-semibold text-primary">
                {nextCheckStr}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function TimelineTab({ companyId }: { companyId: string }) {
  const { data: events, isLoading, isError, refetch } = useCompanyTimeline(companyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <ErrorState message="Could not load the timeline." onRetry={() => refetch()} />;
  }
  if (!events || events.length === 0) {
    return (
      <EmptyState
        title="No timeline events recorded"
        description="Monitoring events for this company will appear here as they occur."
      />
    );
  }

  return (
    <ol className="space-y-6 border-l border-border pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {event.event_type.replace(/_/g, " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(event.occurred_at).toLocaleString()}
            </span>
          </div>
          {event.description ? (
            <p className="mt-1.5 text-sm text-foreground">{event.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

const EVIDENCE_PAGE_SIZE = 10;

function ReportsTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { data: evidence, isLoading: evidenceLoading } = useCompanyEvidence(companyId);
  const { data: sarReports, isLoading: sarLoading } = useSarReports();
  const companySars = (sarReports ?? []).filter((s) => s.company_id === companyId);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const visibleEvidence =
    showAllEvidence || !evidence ? evidence : evidence.slice(0, EVIDENCE_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SAR reports</CardTitle>
        </CardHeader>
        <CardContent>
          {sarLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : companySars.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No SAR reports"
              description="Suspicious activity reports for this company will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {companySars.map((sar) => (
                <li key={sar.id}>
                  <Link
                    to={`/sar/${sar.id}`}
                    className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {companyName} — {new Date(sar.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <NeedsReviewPulse status={sar.status} />
                        <SarStatusBadge status={sar.status} />
                      </div>
                    </div>
                    {sar.narrative ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{previewLines(sar.narrative)}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          {evidenceLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !evidence || evidence.length === 0 ? (
            <EmptyState title="No evidence collected yet" />
          ) : (
            <ul className="space-y-2">
              {visibleEvidence!.map((item) => (
                <li key={item.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {item.evidence_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.collected_at).toLocaleDateString()}
                    </span>
                  </div>
                  {item.content ? (
                    <p className="mt-1.5 text-sm text-foreground">{item.content}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {evidence && evidence.length > EVIDENCE_PAGE_SIZE ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setShowAllEvidence((prev) => !prev)}
            >
              {showAllEvidence ? "Show less" : `Show all ${evidence.length}`}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "overview";
  const { data: company, isLoading, isError, refetch } = useCompany(id);
  const triggerRun = useTriggerMonitoringRun();

  return (
    <div className="space-y-6">
      <Link
        to="/companies"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to companies
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !company ? (
        <Card>
          <CardContent>
            <ErrorState message="Could not load this company." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title={company.legal_name || "Unnamed company"}
            action={
              <div className="flex items-center gap-2">
                <CompanyStatusBadge status={company.monitoring_status} />
                <RiskBadge level={company.risk_level} />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={triggerRun.isPending}
                        onClick={() => triggerRun.mutate(company.id)}
                      />
                    }
                  >
                    <RefreshCw
                      data-icon="inline-start"
                      className={triggerRun.isPending ? "animate-spin" : undefined}
                    />
                    {triggerRun.isPending ? "Scanning..." : "Quick Scan"}
                  </TooltipTrigger>
                  <TooltipContent>Fast background scan — no live execution view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        to={`/companies/${company.id}/execute`}
                        className={buttonVariants({ size: "sm" })}
                      />
                    }
                  >
                    Full Audit
                  </TooltipTrigger>
                  <TooltipContent>Runs all 6 AI agents with live execution view and SAR generation</TooltipContent>
                </Tooltip>
              </div>
            }
          />

          <Tabs defaultValue={initialTab}>
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <OverviewTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-4">
              <TimelineTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="reports" className="pt-4">
              <ReportsTab companyId={company.id} companyName={company.legal_name} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
