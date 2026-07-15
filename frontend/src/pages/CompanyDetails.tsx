import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import type { Company } from "@/types";

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  occurred_at: string;
}

interface Evidence {
  id: string;
  evidence_type: string;
  source_url: string | null;
  content: string | null;
  collected_at: string;
}

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();

  // 1. Fetch Company profile
  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => apiClient.get<Company>(`/companies/${companyId}`),
    enabled: !!companyId,
  });

  // 2. Fetch Timeline events
  const { data: timeline } = useQuery({
    queryKey: ["timeline", companyId],
    queryFn: () => apiClient.get<TimelineEvent[]>(`/reports/companies/${companyId}/timeline`),
    enabled: !!companyId,
  });

  // 3. Fetch Scraped evidence items
  const { data: evidence } = useQuery({
    queryKey: ["evidence", companyId],
    queryFn: () => apiClient.get<Evidence[]>(`/reports/companies/${companyId}/evidence`),
    enabled: !!companyId,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading company profile...</div>;
  }

  if (!company) {
    return <div className="text-sm text-red-500">Company not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company.legal_name}</h1>
          <p className="text-sm text-muted-foreground">Corporate Customer Compliance File</p>
        </div>
        <Link to={`/companies/${companyId}/execute`}>
          <Button className="font-semibold shadow-sm">Trigger Compliance Scan</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Corporate Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Corporate Information</CardTitle>
            <CardDescription>Official registration parameters</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">REGISTRATION NUMBER</span>
              <span className="text-sm font-semibold">{company.registration_number || "N/A"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">JURISDICTION</span>
              <span className="text-sm font-semibold">{company.jurisdiction || "N/A"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">INDUSTRY</span>
              <span className="text-sm font-semibold">{company.industry || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Risk Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk & Audit Status</CardTitle>
            <CardDescription>Current computed standing</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">RISK LEVEL</span>
              <span className={`text-sm font-bold uppercase inline-block px-2.5 py-0.5 rounded-full mt-1 ${
                company.risk_level === "high" 
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
                  : (company.risk_level === "medium" 
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400")
              }`}>
                {company.risk_level}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">MONITORING STATUS</span>
              <span className="text-sm font-semibold capitalize">{company.monitoring_status}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">LAST COMPLIANCE RUN</span>
              <span className="text-sm font-semibold">
                {company.onboarded_at ? new Date(company.onboarded_at).toLocaleString() : "Never Audited"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline Events */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Audit Timeline</CardTitle>
              <CardDescription>Key compliance history events</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-4">
              {!timeline || timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No events logged.</p>
              ) : (
                <div className="relative pl-4 border-l border-border flex flex-col gap-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                      <span className="text-[10px] text-muted-foreground block">
                        {new Date(event.occurred_at).toLocaleDateString()}
                      </span>
                      <h5 className="text-xs font-semibold mt-0.5 capitalize">{event.event_type.replace("_", " ")}</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evidence Gathered */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Audit Evidence</CardTitle>
              <CardDescription>Harvested watchlist and adverse news items</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-3">
              {!evidence || evidence.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No evidence collected yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {evidence.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-border text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30 px-2 py-0.5 rounded-full">
                          {item.evidence_type}
                        </span>
                        {item.source_url && (
                          <a 
                            href={item.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            View Source ↗
                          </a>
                        )}
                      </div>
                      <p className="text-xs mt-2 text-foreground/90 font-mono leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


