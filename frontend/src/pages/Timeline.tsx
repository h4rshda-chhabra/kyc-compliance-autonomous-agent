import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/services/apiClient";

interface MonitoringRun {
  id: string;
  company_id: string;
  company_name: string;
  status: string;
  trigger_type: string;
  started_at: string;
  completed_at: string | null;
}

export function Timeline() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["monitoring-runs"],
    queryFn: () => apiClient.get<MonitoringRun[]>("/monitor/runs"),
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Monitoring Runs</h1>
        <p className="text-sm text-muted-foreground">
          Historical record of all manual and scheduled continuous monitoring executions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monitoring History</CardTitle>
          <CardDescription>Execution runs across all corporate profiles</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
          {!isLoading && (!runs || runs.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No monitoring runs logged yet.</p>
          )}
          {!isLoading && runs && runs.length > 0 && (
            <div className="relative pl-6 border-l border-border flex flex-col gap-6 mt-4">
              {runs.map((run) => (
                <div key={run.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Started: {new Date(run.started_at).toLocaleString()}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      run.status === "completed" 
                        ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" 
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400"
                    }`}>
                      {run.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold mt-1">
                    {run.company_name}
                  </h4>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger type: <strong className="capitalize text-foreground">{run.trigger_type}</strong>
                  </p>

                  {run.completed_at && (
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Completed: {new Date(run.completed_at).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
