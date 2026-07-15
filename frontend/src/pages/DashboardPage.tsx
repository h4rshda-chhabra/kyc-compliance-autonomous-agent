import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ClipboardList, Radar, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { RunStatusBadge } from "@/components/status-badges";
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
import { useCompanies } from "@/hooks/useCompanies";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useMonitoringRuns } from "@/hooks/useMonitoringRuns";

const statCards = [
  { key: "total_companies" as const, label: "Total companies", icon: Building2 },
  { key: "active_monitoring" as const, label: "Active monitoring", icon: Radar },
  { key: "escalated" as const, label: "Escalated", icon: TriangleAlert },
  { key: "open_reviews" as const, label: "Open reviews", icon: ClipboardList },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading, isError, refetch } = useDashboardSummary();
  const { data: companies } = useCompanies();
  const { data: runs } = useMonitoringRuns();

  const companyName = (companyId: string) =>
    companies?.find((c) => c.id === companyId)?.legal_name || companyId.slice(0, 8);
  const recentRuns = (runs ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Portfolio-wide continuous KYC compliance overview."
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
                        {summary?.[key] ?? 0}
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
              <EmptyState title="No companies yet" description="Risk distribution appears once companies are onboarded." />
            ) : (
              <RiskDistributionChart companies={companies} />
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
