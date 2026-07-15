import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export function Monitoring() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["monitoring-runs-list"],
    queryFn: () => apiClient.get<MonitoringRun[]>("/monitor/runs"),
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Monitoring Hub</h1>
        <p className="text-sm text-muted-foreground">
          Track background batch jobs, scheduler runs, and user-initiated scans.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active & Historical Monitoring Jobs</CardTitle>
          <CardDescription>Full audit log of execution runs</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Loading monitoring queue...</p>}
          {!isLoading && (!runs || runs.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No monitoring executions logged yet.</p>
          )}
          {!isLoading && runs && runs.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="grid grid-cols-5 gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                <div>COMPANY</div>
                <div>TRIGGER TYPE</div>
                <div>STARTED AT</div>
                <div>STATUS</div>
                <div className="text-right">ACTION</div>
              </div>
              {runs.map((run) => (
                <div 
                  key={run.id} 
                  className="grid grid-cols-5 gap-4 px-3 py-3 text-sm items-center border-b border-border/50 hover:bg-muted/20 rounded-md transition-colors"
                >
                  <div className="font-semibold">{run.company_name}</div>
                  <div className="capitalize">{run.trigger_type}</div>
                  <div>{new Date(run.started_at).toLocaleString()}</div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      run.status === "completed" 
                        ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" 
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400"
                    }`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <Link to={`/companies/${run.company_id}`}>
                      <Button variant="outline" size="sm">Audit File</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
