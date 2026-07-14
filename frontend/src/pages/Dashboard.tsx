import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/services/apiClient";

interface DashboardSummary {
  total_companies: number;
  active_monitoring: number;
  escalated: number;
  open_reviews: number;
}

const STAT_LABELS: Record<keyof DashboardSummary, string> = {
  total_companies: "Total Companies",
  active_monitoring: "Active Monitoring",
  escalated: "Escalated",
  open_reviews: "Open Reviews",
};

export function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiClient.get<DashboardSummary>("/dashboard/summary"),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {isError && <p className="text-sm text-destructive">Could not reach the backend API.</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(Object.keys(STAT_LABELS) as (keyof DashboardSummary)[]).map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {STAT_LABELS[key]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{isLoading ? "…" : (data?.[key] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
