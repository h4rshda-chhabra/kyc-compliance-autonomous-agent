import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { RunStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanies } from "@/hooks/useCompanies";
import {
  useMonitoringRuns,
  useSimulateWatchlistUpdate,
} from "@/hooks/useMonitoringRuns";

export function MonitoringPage() {
  const { data: runs, isLoading: isRunsLoading, isError: isRunsError, refetch: refetchRuns } = useMonitoringRuns();
  const { data: companies } = useCompanies();
  const simulateWatchlist = useSimulateWatchlistUpdate();

  const companyName = (companyId: string) =>
    companies?.find((c) => c.id === companyId)?.legal_name || companyId.slice(0, 8);

  const handleSimulateClick = async () => {
    try {
      await simulateWatchlist.mutateAsync();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditor Control Center"
        description="Monitor automated re-screening sweeps triggered by watchlist changes and manual scans."
        action={
          <Button
            disabled={simulateWatchlist.isPending}
            onClick={handleSimulateClick}
          >
            <RefreshCw
              data-icon="inline-start"
              className={simulateWatchlist.isPending ? "animate-spin" : undefined}
            />
            {simulateWatchlist.isPending ? "Running..." : "Simulate Watchlist Update"}
          </Button>
        }
      />

      <Card>
        <CardContent className="px-0">
          {isRunsLoading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isRunsError ? (
            <ErrorState message="Could not load monitoring runs." onRetry={() => refetchRuns()} />
          ) : !runs || runs.length === 0 ? (
            <EmptyState
              title="No monitoring runs yet"
              description="Runs triggered by watchlist updates or manual scans will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {run.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link to={`/companies/${run.company_id}`} className="hover:underline">
                        {companyName(run.company_id)}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {run.trigger_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {run.summary || "—"}
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
  );
}
