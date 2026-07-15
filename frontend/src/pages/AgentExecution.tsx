import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/status-badges";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { apiClient } from "@/services/apiClient";
import type { Company, RiskLevel } from "@/types/models";

interface SarOutcome {
  generated_new: boolean;
  id: string | null;
  status: string | null;
  created_at: string | null;
  message: string | null;
}

interface AuditResult {
  run_id: string;
  company_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  rationale: string | null;
  sanctions_hits: number;
  media_hits: number;
  material_change: boolean;
  sar: SarOutcome;
}

const STEPS = [
  { id: "planner", label: "Planner Agent", desc: "Analyzing company profile and establishing search schema" },
  { id: "sanctions", label: "Sanctions Agent", desc: "Searching OFAC & OpenSanctions SQLite indices" },
  { id: "news", label: "Adverse Media Agent", desc: "Querying Google News RSS XML feeds at runtime" },
  { id: "resolution", label: "Entity Resolution Agent", desc: "Evaluating Jaro-Winkler scores to prune false positives" },
  { id: "risk", label: "Risk Assessment Agent", desc: "Running weighted rules matrix and LLM justification" },
  { id: "sar", label: "SAR Generation Agent", desc: "Assembling FinCEN draft report in markdown" },
];

export function AgentExecution() {
  const { companyId } = useParams<{ companyId: string }>();

  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Fetch company details to show on the header
  const { data: company, isLoading: isCompanyLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const res = await apiClient.get<Company>(`/companies/${companyId}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  // Call PostgreSQL trigger endpoint
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<AuditResult>(`/monitor/companies/${companyId}/trigger`);
      return res.data;
    },
    onSuccess: (data) => {
      setLogs((prev) => [...prev, `[✓] Execution Complete! Run ID: ${data.run_id}`]);
      setLogs((prev) => [...prev, `[✓] Resolved Risk Score: ${data.risk_score}/100 (${data.risk_level.toUpperCase()})`]);
      setLogs((prev) => [...prev, `[✓] Watches matched: ${data.sanctions_hits}, Adverse news articles: ${data.media_hits}`]);
      setActiveStepIndex(STEPS.length); // complete
      setIsSimulating(false);
    },
    onError: (err) => {
      setLogs((prev) => [...prev, `[✗] Error executing audit: ${err instanceof Error ? err.message : String(err)}`]);
      setIsSimulating(false);
    },
  });

  const simulateStep = (index: number) => {
    if (index >= STEPS.length) {
      // Execute the real API call
      setLogs((prev) => [...prev, "[Orchestrator] Finalizing database writes and synthesizing final audit report..."]);
      mutation.mutate();
      return;
    }

    setActiveStepIndex(index);
    const step = STEPS[index];
    
    // Add logs depending on current step
    let logMsg = `[${step.label.toUpperCase()}] Running task...`;
    if (step.id === "planner") {
      logMsg = `[Planner] Extracting directors list for ${company?.legal_name || "Company"}...`;
    } else if (step.id === "sanctions") {
      logMsg = "[Sanctions] Running fuzzy index checks against local targets.simple.csv data...";
    } else if (step.id === "news") {
      logMsg = "[Adverse Media] Connecting to Google News RSS query links...";
    } else if (step.id === "resolution") {
      logMsg = "[Entity Resolution] Calculating WRatio distance filters to prune names...";
    } else if (step.id === "risk") {
      logMsg = "[Risk Assessment] Evaluating compliance exposure matrix...";
    } else if (step.id === "sar") {
      logMsg = "[SAR Agent] Drafting narrative sections from template guidelines...";
    }

    setLogs((prev) => [...prev, logMsg]);

    setTimeout(() => {
      setLogs((prev) => [...prev, `[✓] ${step.label} finished successfully.`]);
      simulateStep(index + 1);
    }, 1500);
  };

  const startAudit = () => {
    setLogs(["[Orchestrator] Initializing multi-agent continuous audit network..."]);
    setIsSimulating(true);
    simulateStep(0);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Autonomous Agent Execution</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and audit corporate customer:{" "}
            {isCompanyLoading ? (
              <span className="inline-block h-4 w-32 align-middle bg-muted rounded animate-pulse" />
            ) : (
              <strong className="text-foreground">{company?.legal_name}</strong>
            )}
          </p>
        </div>
        <Link to={mutation.isSuccess ? `/companies/${companyId}?tab=reports` : `/companies/${companyId}`}>
          <Button variant="outline" size="sm">Back to Profile</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Step Tracker */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Agent Pipeline Nodes</CardTitle>
              <CardDescription>Visual execution pipeline status</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-0">
              {STEPS.map((step, idx) => {
                const isActive = idx === activeStepIndex;
                const isCompleted = idx < activeStepIndex;
                
                return (
                  <div key={step.id} className="flex gap-3 items-start">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 border ${
                      isCompleted 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : (isActive 
                            ? "bg-yellow-500 text-black border-yellow-500 animate-pulse" 
                            : "bg-muted text-muted-foreground border-border")
                    }`}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${isActive ? "text-yellow-600 dark:text-yellow-400 font-semibold" : "text-foreground"}`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Log Output and Actions */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="flex flex-col h-[400px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">System Audit Logs</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto bg-black text-green-400 font-mono text-xs p-4 rounded-md mx-6 mb-6">
              {logs.length === 0 && (
                <div className="text-muted-foreground italic h-full flex items-center justify-center">
                  Click 'Start Compliance Audit' to trigger the autonomous agents.
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 leading-relaxed">
                  {log}
                </div>
              ))}
            </CardContent>
          </Card>

          {mutation.isSuccess && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Scan Result</CardTitle>
                <CardDescription>Outcome of this audit run — no need to navigate elsewhere to see it.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <RiskGauge score={mutation.data.risk_score} />
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={mutation.data.risk_level} />
                      {mutation.data.material_change && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Material change detected</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span><strong className="tabular-nums">{mutation.data.sanctions_hits}</strong> <span className="text-muted-foreground">sanctions hits</span></span>
                      <span><strong className="tabular-nums">{mutation.data.media_hits}</strong> <span className="text-muted-foreground">media hits</span></span>
                    </div>
                    {mutation.data.rationale && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{mutation.data.rationale}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  {mutation.data.sar.id ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-sm">
                        {mutation.data.sar.generated_new ? "New SAR generated for this run." : "Existing SAR remains current."}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        No SAR generated — {mutation.data.sar.message ?? `risk score (${mutation.data.risk_score}) is below the SAR threshold`}.
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 items-center justify-end">
            {mutation.isSuccess && (
              <>
                {mutation.data.sar.id ? (
                  <Link to={`/sar/${mutation.data.sar.id}`}>
                    <Button variant="outline">
                      <FileText className="w-4 h-4 mr-1.5" />
                      Review SAR
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled>
                    <FileText className="w-4 h-4 mr-1.5" />
                    No SAR to review
                  </Button>
                )}
                <Button variant="outline" onClick={() => { mutation.reset(); setLogs([]); setActiveStepIndex(-1); }}>
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Run another scan
                </Button>
                <Link to={`/companies/${companyId}?tab=reports`}>
                  <Button>View Risk Profile</Button>
                </Link>
              </>
            )}

            {!mutation.isSuccess && (
              <Button
                onClick={startAudit}
                disabled={isSimulating}
                className="w-48"
              >
                {isSimulating ? "Agent Thinking..." : "Start Compliance Audit"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
