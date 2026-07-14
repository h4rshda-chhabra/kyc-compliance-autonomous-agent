import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/services/apiClient";
import type { Company } from "@/types";

export function Companies() {
  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiClient.get<Company[]>("/companies"),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>

      <Card>
        <CardContent className="pt-6">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (!data || data.length === 0) && (
            <p className="text-sm text-muted-foreground">No companies onboarded yet.</p>
          )}
          {!isLoading && data && data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {data.map((company) => (
                <li key={company.id}>
                  <Link to={`/companies/${company.id}`} className="text-sm hover:underline">
                    {company.legal_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
