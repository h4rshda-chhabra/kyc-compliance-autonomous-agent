import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import type { Company } from "@/types";

export function Risk() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies-risk"],
    queryFn: () => apiClient.get<Company[]>("/companies"),
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Risk Directory</h1>
        <p className="text-sm text-muted-foreground">
          Risk ratings and classifications across all audited corporate customers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Corporate Risks</CardTitle>
          <CardDescription>Consolidated risk categorization view</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Loading risks...</p>}
          {!isLoading && (!companies || companies.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No company risk evaluations found.</p>
          )}
          {!isLoading && companies && companies.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="grid grid-cols-4 gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                <div>COMPANY NAME</div>
                <div>JURISDICTION</div>
                <div>RISK LEVEL</div>
                <div className="text-right">ACTION</div>
              </div>
              {companies.map((comp) => (
                <div 
                  key={comp.id} 
                  className="grid grid-cols-4 gap-4 px-3 py-3 text-sm items-center border-b border-border/50 hover:bg-muted/20 rounded-md transition-colors"
                >
                  <div className="font-semibold">{comp.legal_name}</div>
                  <div>{comp.jurisdiction || "N/A"}</div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      comp.risk_level === "high" 
                        ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400" 
                        : (comp.risk_level === "medium" 
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400" 
                            : "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400")
                    }`}>
                      {comp.risk_level}
                    </span>
                  </div>
                  <div className="text-right">
                    <Link to={`/companies/${comp.id}`}>
                      <Button variant="outline" size="sm">View breakdown</Button>
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
