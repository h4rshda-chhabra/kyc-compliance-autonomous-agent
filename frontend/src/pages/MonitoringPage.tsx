import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Database, RefreshCw, XCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { RunStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanies } from "@/hooks/useCompanies";
import {
  useMonitoringRuns,
  useSanctionsSyncHistory,
  useTriggerSanctionsSync,
} from "@/hooks/useMonitoringRuns";

export function MonitoringPage() {
  const { data: runs, isLoading: isRunsLoading, isError: isRunsError, refetch: refetchRuns } = useMonitoringRuns();
  const { data: syncLogs, isLoading: isLogsLoading, isError: isLogsError, refetch: refetchLogs } = useSanctionsSyncHistory();
  const { data: companies } = useCompanies();
  const triggerSync = useTriggerSanctionsSync();

  const [activeTab, setActiveTab] = useState("runs");

  const companyName = (companyId: string) =>
    companies?.find((c) => c.id === companyId)?.legal_name || companyId.slice(0, 8);

  const handleSyncClick = async () => {
    try {
      await triggerSync.mutateAsync(undefined);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditor Control Center"
        description="Monitor automated run execution sweeps and manage sanctions database synchronization."
        action={
          activeTab === "sync" && (
            <Button disabled={triggerSync.isPending} onClick={handleSyncClick}>
              <RefreshCw
                data-icon="inline-start"
                className={triggerSync.isPending ? "animate-spin" : undefined}
              />
              {triggerSync.isPending ? "Syncing..." : "Sync Watchlists Now"}
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="runs">Monitoring Sweeps</TabsTrigger>
          <TabsTrigger value="sync">Sanctions Sync Audits</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="pt-4">
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
                  description="Runs triggered manually or on a schedule will appear here."
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
        </TabsContent>

        <TabsContent value="sync" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle>Sync History Log</CardTitle>
                <CardDescription>
                  Detailed history of dataset downloads, schema validations, and database delta counts.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
                <Database className="size-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Active Database</div>
                  <div className="font-mono text-sm font-semibold">sanctions_lookup.db</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {isLogsLoading ? (
                <div className="space-y-3 px-4 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : isLogsError ? (
                <ErrorState message="Could not load sanctions sync logs." onRetry={() => refetchLogs()} />
              ) : !syncLogs || syncLogs.length === 0 ? (
                <EmptyState
                  icon={Database}
                  title="No sync operations logged"
                  description="Click 'Sync Watchlists Now' to trigger the first sanctions database audit."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset Version</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Removed</TableHead>
                      <TableHead>Total Records</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Completed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm text-foreground">
                          {log.dataset_version}
                        </TableCell>
                        <TableCell className="text-emerald-500 font-semibold">
                          +{log.records_added}
                        </TableCell>
                        <TableCell className="text-blue-500 font-semibold">
                          ~{log.records_updated}
                        </TableCell>
                        <TableCell className="text-rose-500 font-semibold">
                          -{log.records_removed}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {log.total_records.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.sync_duration_seconds}s
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                              <CheckCircle className="size-4" /> Success
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 cursor-help"
                              title={log.failure_reason || "Unknown error"}
                            >
                              <XCircle className="size-4" /> Failed
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {new Date(log.sync_timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
