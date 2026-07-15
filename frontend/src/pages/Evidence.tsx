import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import type { Company } from "@/types";

export function Evidence() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies-evidence"],
    queryFn: () => apiClient.get<Company[]>("/companies"),
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Evidence Dossiers</h1>
        <p className="text-sm text-muted-foreground">
          Browse scraped media, sanctions registry records, and company documents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Evidence Folders</CardTitle>
          <CardDescription>Select a company to open its verified evidence panel</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Loading evidence directories...</p>}
          {!isLoading && (!companies || companies.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No corporate customer data found.</p>
          )}
          {!isLoading && companies && companies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {companies.map((comp) => (
                <Card key={comp.id} className="hover:bg-muted/10 transition-colors border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">{comp.legal_name}</CardTitle>
                    <CardDescription>Jurisdiction: {comp.jurisdiction || "N/A"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground block">Monitoring Status</span>
                        <span className="font-semibold capitalize">{comp.monitoring_status}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block">Risk Level</span>
                        <span className={`font-bold uppercase inline-block px-2 py-0.5 rounded-full ${
                          comp.risk_level === "high" 
                            ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400" 
                            : (comp.risk_level === "medium" 
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400" 
                                : "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400")
                        }`}>
                          {comp.risk_level}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-border/50">
                      <Link to={`/companies/${comp.id}`}>
                        <Button size="sm" variant="outline" className="font-semibold">
                          View Compliance Dossier
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
