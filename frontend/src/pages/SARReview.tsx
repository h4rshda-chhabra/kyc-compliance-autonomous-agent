import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";

interface SARReport {
  id: string;
  company_id: string;
  company_name: string;
  status: string;
  narrative: string;
  created_at: string;
}

export function SARReview() {
  const queryClient = useQueryClient();
  const [selectedSar, setSelectedSar] = useState<SARReport | null>(null);

  // Fetch all pending SAR reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["sar-reports"],
    queryFn: () => apiClient.get<SARReport[]>("/review/sar"),
  });

  // Submit review decision (filed/dismissed)
  const mutation = useMutation({
    mutationFn: ({ sarId, decision }: { sarId: string; decision: "filed" | "dismissed" }) =>
      apiClient.post(`/review/sar/${sarId}/decision?decision=${decision}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
      setSelectedSar(null);
    },
  });

  const handleDecision = (decision: "filed" | "dismissed") => {
    if (!selectedSar) return;
    mutation.mutate({ sarId: selectedSar.id, decision });
  };

  const pendingReports = reports?.filter((r) => r.status === "draft") || [];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suspicious Activity Reports (SAR)</h1>
        <p className="text-sm text-muted-foreground">
          Human-in-the-loop review queue for flagged corporate entities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left List of Reports */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Review Queue</CardTitle>
              <CardDescription>Select a draft SAR to review details</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0 flex flex-col gap-2">
              {isLoading && <p className="text-sm text-muted-foreground">Loading queue...</p>}
              {!isLoading && pendingReports.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  No SAR reports pending review.
                </p>
              )}
              {pendingReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedSar(report)}
                  className={`p-3 rounded-lg border cursor-pointer text-left transition-colors ${
                    selectedSar?.id === report.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-border"
                  }`}
                >
                  <h4 className="text-sm font-semibold">{report.company_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered: {new Date(report.created_at).toLocaleDateString()}
                  </p>
                  <span className="text-[10px] uppercase font-bold text-red-500 bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded-full inline-block mt-2">
                    {report.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Details Panel */}
        <div className="md:col-span-2">
          {selectedSar ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-bold">Draft Report: {selectedSar.company_name}</CardTitle>
                  <CardDescription>Review the generated compliance findings below</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDecision("dismissed")}
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 font-semibold"
                    disabled={mutation.isPending}
                  >
                    Dismiss Risk
                  </Button>
                  <Button
                    onClick={() => handleDecision("filed")}
                    size="sm"
                    className="font-semibold"
                    disabled={mutation.isPending}
                  >
                    Approve & File SAR
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 bg-muted/20 text-left font-sans prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap font-mono text-xs text-foreground/90 leading-relaxed">
                  {selectedSar.narrative}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center border-dashed">
              <div className="text-center text-muted-foreground p-6">
                <p className="text-sm italic">Select a suspicious activity report from the queue to view its full context.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
