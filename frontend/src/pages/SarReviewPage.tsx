import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, XCircle } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SarStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/hooks/useCompanies";
import { useSarDecision, useSarReport } from "@/hooks/useSarReports";

export function SarReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sar, isLoading, isError, refetch } = useSarReport(id);
  const { data: company } = useCompany(sar?.company_id);
  const decision = useSarDecision(id);
  const [lastDecision, setLastDecision] = useState<"approved" | "rejected" | null>(null);

  async function handleDecision(next: "approved" | "rejected") {
    await decision.mutateAsync(next).catch(() => undefined);
    setLastDecision(next);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/reviews"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to SAR reviews
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !sar ? (
        <Card>
          <CardContent>
            <ErrorState message="Could not load this SAR report." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title={`SAR ${sar.id.slice(0, 8)}`}
            description={company?.legal_name || undefined}
            action={<SarStatusBadge status={sar.status} />}
          />

          <Card>
            <CardHeader>
              <CardTitle>Narrative</CardTitle>
            </CardHeader>
            <CardContent>
              {sar.narrative ? (
                <p className="text-sm leading-relaxed text-foreground">{sar.narrative}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No narrative has been drafted yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviewer decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastDecision ? (
                <p className="text-sm font-medium text-foreground">
                  Decision recorded: <span className="capitalize">{lastDecision}</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={decision.isPending}
                  onClick={() => handleDecision("approved")}
                >
                  <CheckCircle2 data-icon="inline-start" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  disabled={decision.isPending}
                  onClick={() => handleDecision("rejected")}
                >
                  <XCircle data-icon="inline-start" />
                  Reject
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button variant="outline" onClick={() => window.print()}>
                  <Download data-icon="inline-start" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
