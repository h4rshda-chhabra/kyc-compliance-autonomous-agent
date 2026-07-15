import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Ban,
  Building2,
  CalendarPlus,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { RiskBadge, RunStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskDistributionChart } from "@/components/charts/RiskDistributionChart";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useMonitoringRuns, useSimulateWatchlistUpdate } from "@/hooks/useMonitoringRuns";
import { useAdminQueue } from "@/hooks/useSarReports";
import type { RiskLevel } from "@/types/models";

const officerStatCards = [
  { key: "companies_under_monitoring", label: "Companies Under Monitoring", icon: Building2 },
  { key: "pending_sar_reviews", label: "Pending SAR Reviews", icon: ClipboardList },
  { key: "high_risk_companies", label: "High Risk Companies", icon: TriangleAlert },
  { key: "manual_audits_today", label: "Manual Audits Today", icon: RefreshCw },
] as const;

const adminStatCards = [
  { key: "active_companies", label: "Active Companies", icon: UserCheck },
  { key: "pending_deactivation_requests", label: "Pending Deactivations", icon: ShieldAlert },
  { key: "deactivated_companies", label: "Deactivated Companies", icon: Ban },
  { key: "companies_added_this_month", label: "Companies Added This Month", icon: CalendarPlus },
] as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const { data: summary, isLoading, isError, refetch } = useDashboardSummary();
  // Only companies actually under monitoring — mixing in the raw sanctions
  // directory would swamp this chart with hundreds of thousands of
  // never-scanned "Unassessed" entities and make it meaningless.
  const { data: companies } = useCompanies(undefined, "all", "monitored");
  const { data: runs } = useMonitoringRuns();
  const adminQueue = useAdminQueue(Boolean(currentUser) && isAdmin);
  const simulateWatchlist = useSimulateWatchlistUpdate();

  const companyName = (companyId: string) =>
    companies?.find((c) => c.id === companyId)?.legal_name || companyId.slice(0, 8);
  const recentRuns = (runs ?? []).slice(0, 6);

  const statCards = isAdmin ? adminStatCards : officerStatCards;
  const summaryValues = (summary ?? {}) as unknown as Record<string, number>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Admin Dashboard" : "Compliance Officer Dashboard"}
        description={
          isAdmin
            ? "Company roster health and deactivation oversight."
            : "Your monitoring workload and review queue."
        }
        action={
          isAdmin ? (
            <Button
              variant="outline"
              size="sm"
              disabled={simulateWatchlist.isPending}
              onClick={() => simulateWatchlist.mutate()}
            >
              <RefreshCw
                data-icon="inline-start"
                className={simulateWatchlist.isPending ? "animate-spin" : undefined}
              />
              {simulateWatchlist.isPending ? "Checking..." : "Check for Watchlist Updates"}
            </Button>
          ) : undefined
        }
      />

      {isError ? (
        <Card>
          <CardContent>
            <ErrorState message="Could not load dashboard summary." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
            >
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-6 w-12" />
                    ) : (
                      <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {summaryValues[key] ?? 0}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {!companies || companies.length === 0 ? (
              <EmptyState
                title="No companies under monitoring yet"
                description="Risk distribution appears once companies have been audited."
              />
            ) : (
              <RiskDistributionChart companies={companies} />
            )}
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Pending Deactivation Requests</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {!adminQueue.data || adminQueue.data.length === 0 ? (
                <div className="px-6">
                  <EmptyState
                    title="Nothing awaiting your decision"
                    description="Deactivation recommendations from compliance officers will appear here."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {adminQueue.data.slice(0, 6).map((sar) => (
                    <li key={sar.id}>
                      <Link
                        to={`/sar/${sar.id}`}
                        className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50"
                      >
                        <span className="font-medium text-foreground">
                          {sar.company_name || sar.company_id}
                        </span>
                        <RiskBadge level={(sar.company_risk_level ?? "unknown") as RiskLevel} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Monitoring Runs</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {recentRuns.length === 0 ? (
                <div className="px-6">
                  <EmptyState title="No monitoring runs yet" description="Runs will appear here once triggered." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRuns.map((run) => (
                      <TableRow
                        key={run.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/companies/${run.company_id}?tab=reports`)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <Link
                            to={`/companies/${run.company_id}?tab=reports`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {companyName(run.company_id)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {run.trigger_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <RunStatusBadge status={run.status} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
