import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/services/apiClient";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  event_metadata: Record<string, any> | null;
  created_at: string;
}

export function AuditTrail() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiClient.get<AuditLog[]>("/audit/logs"),
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          System-wide immutable trail of KYC reviews, scans, and human decisions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Audit Logs</CardTitle>
          <CardDescription>Chronological sequence of actions</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Loading audit trail...</p>}
          {!isLoading && (!logs || logs.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No audit actions recorded yet.</p>
          )}
          {!isLoading && logs && logs.length > 0 && (
            <div className="relative pl-6 border-l border-border flex flex-col gap-6 mt-4">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Actor: {log.actor}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold mt-1 capitalize">
                    {log.action.replace("_", " ")}
                  </h4>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Targeted {log.resource_type} (ID: {log.resource_id || "System"})
                  </p>

                  {log.event_metadata && (
                    <div className="bg-muted/30 p-2 rounded text-[11px] font-mono text-foreground/80 mt-2 whitespace-pre-wrap max-w-xl">
                      {JSON.stringify(log.event_metadata, null, 2)}
                    </div>
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
