import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2, Download, ShieldAlert, ShieldX } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { NeedsReviewPulse, SarStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompanies";
import {
  useApproveDeactivation,
  useRecommendDeactivation,
  useRejectByAdmin,
  useRejectByOfficer,
  useSarReport,
} from "@/hooks/useSarReports";

function ReviewTrail({ sar }: { sar: NonNullable<ReturnType<typeof useSarReport>["data"]> }) {
  const review = sar.review;
  if (!review) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review trail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium text-foreground">
            Compliance officer:{" "}
            <span className="capitalize">{review.decision?.replace(/_/g, " ")}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {review.reviewed_at ? new Date(review.reviewed_at).toLocaleString() : "—"}
          </p>
          {review.notes ? <p className="mt-1 text-muted-foreground">{review.notes}</p> : null}
        </div>
        {review.final_decision ? (
          <>
            <Separator />
            <div>
              <p className="font-medium text-foreground">
                Admin: <span className="capitalize">{review.final_decision.replace(/_/g, " ")}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {review.admin_reviewed_at ? new Date(review.admin_reviewed_at).toLocaleString() : "—"}
              </p>
              {review.admin_notes ? <p className="mt-1 text-muted-foreground">{review.admin_notes}</p> : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SarReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sar, isLoading, isError, refetch } = useSarReport(id);
  const { data: company } = useCompany(sar?.company_id);
  const { data: currentUser } = useCurrentUser();
  const [remarks, setRemarks] = useState("");
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);

  const recommendDeactivation = useRecommendDeactivation();
  const rejectByOfficer = useRejectByOfficer();
  const approveDeactivation = useApproveDeactivation();
  const rejectByAdmin = useRejectByAdmin();

  const isCompanyOfficer = currentUser?.role === "COMPLIANCE_OFFICER";
  const isAdmin = currentUser?.role === "ADMIN";
  const canOfficerAct = isCompanyOfficer && sar?.status === "draft";
  const canAdminAct = isAdmin && sar?.status === "pending_admin_review";
  const anyActionPending =
    recommendDeactivation.isPending ||
    rejectByOfficer.isPending ||
    approveDeactivation.isPending ||
    rejectByAdmin.isPending;

  async function runAction(
    mutation: ReturnType<typeof useRecommendDeactivation>,
    outcomeLabel: string
  ) {
    if (!id) return;
    await mutation.mutateAsync({ id, remarks: remarks.trim() || undefined }).catch(() => undefined);
    setLastOutcome(outcomeLabel);
    setTimeout(() => navigate("/reviews"), 1500);
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
            title={`${company?.legal_name || "SAR"} — ${new Date(sar.created_at).toLocaleDateString()}`}
            description={company?.legal_name ? undefined : `SAR ${sar.id.slice(0, 8)}`}
            action={
              <div className="flex items-center gap-2">
                <NeedsReviewPulse status={sar.status} />
                <SarStatusBadge status={sar.status} />
              </div>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Narrative</CardTitle>
            </CardHeader>
            <CardContent>
              {sar.narrative ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-hr:my-4">
                  <ReactMarkdown>{sar.narrative}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No narrative has been drafted yet.</p>
              )}
            </CardContent>
          </Card>

          <ReviewTrail sar={sar} />

          {lastOutcome ? (
            // Checked before canOfficerAct/canAdminAct on purpose: submitting a
            // decision invalidates the SAR query, and the fresh status flips
            // both of those to false as soon as it lands — often before this
            // confirmation would otherwise get a chance to render. Keeping this
            // branch keyed only on lastOutcome means it stays on screen for the
            // full redirect delay regardless of how fast the refetch resolves.
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-foreground">Decision recorded: {lastOutcome}</p>
              </CardContent>
            </Card>
          ) : canOfficerAct || canAdminAct ? (
            <Card>
              <CardHeader>
                <CardTitle>{canAdminAct ? "Admin decision" : "Compliance officer decision"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Optional remarks for the audit trail..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={anyActionPending}
                />
                <div className="flex flex-wrap gap-2">
                  {canOfficerAct && (
                    <>
                      <Button
                        disabled={anyActionPending}
                        onClick={() => runAction(recommendDeactivation, "Recommended deactivation")}
                      >
                        <ShieldAlert data-icon="inline-start" />
                        Recommend Deactivation
                      </Button>
                      <Button
                        variant="outline"
                        disabled={anyActionPending}
                        onClick={() => runAction(rejectByOfficer, "Rejected — monitoring continues")}
                      >
                        <CheckCircle2 data-icon="inline-start" />
                        Reject
                      </Button>
                    </>
                  )}
                  {canAdminAct && (
                    <>
                      <Button
                        variant="destructive"
                        disabled={anyActionPending}
                        onClick={() => runAction(approveDeactivation, "Deactivation approved")}
                      >
                        <ShieldX data-icon="inline-start" />
                        Approve Deactivation
                      </Button>
                      <Button
                        variant="outline"
                        disabled={anyActionPending}
                        onClick={() => runAction(rejectByAdmin, "Recommendation rejected — monitoring continues")}
                      >
                        <CheckCircle2 data-icon="inline-start" />
                        Reject Recommendation
                      </Button>
                    </>
                  )}
                  <Separator orientation="vertical" className="h-8" />
                  <Button variant="outline" onClick={() => window.print()}>
                    <Download data-icon="inline-start" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-3 py-6">
                <p className="text-sm text-muted-foreground">
                  {sar.status === "draft"
                    ? "Awaiting compliance officer review."
                    : sar.status === "pending_admin_review"
                      ? "Awaiting admin review."
                      : "This SAR has already been resolved — no further action is needed."}
                </p>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Download data-icon="inline-start" />
                  Export
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
