import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { CompanyStatusBadge, RiskBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanies } from "@/hooks/useCompanies";
import { useTriggerMonitoringRun } from "@/hooks/useMonitoringRuns";
import { CreateCompanyDialog } from "@/components/CreateCompanyDialog";

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: companies, isLoading, isError, refetch } = useCompanies(deferredSearch);
  const triggerRun = useTriggerMonitoringRun();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Company directory from the sanctions dataset — scan any entry to assess it."
        action={
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search the full dataset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <CreateCompanyDialog />
          </div>
        }
      />

      <Card>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="Could not load companies." onRetry={() => refetch()} />
          ) : !companies || companies.length === 0 ? (
            <EmptyState
              title={search ? "No companies match your search" : "No companies found"}
              description={
                search
                  ? "Try a different company name."
                  : "The company directory could not be loaded from the dataset."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legal name</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => {
                  const isScanning =
                    triggerRun.isPending && triggerRun.variables === company.id;
                  return (
                    <TableRow key={company.id}>
                      <TableCell className="max-w-xs truncate font-medium text-foreground">
                        <Link to={`/companies/${company.id}`} className="block truncate hover:underline">
                          {company.legal_name || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-40 truncate uppercase text-muted-foreground">
                        {company.jurisdiction || "—"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">
                        {company.industry || "—"}
                      </TableCell>
                      <TableCell>
                        <CompanyStatusBadge status={company.monitoring_status} />
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={company.risk_level} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isScanning}
                          onClick={() => triggerRun.mutate(company.id)}
                        >
                          <RefreshCw
                            data-icon="inline-start"
                            className={isScanning ? "animate-spin" : undefined}
                          />
                          {isScanning ? "Scanning..." : "Scan"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
