import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { MonitoringLifecycleBadge, RiskBadge } from "@/components/status-badges";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useCompanies, type CompanyStatusFilter } from "@/hooks/useCompanies";
import { useCurrentUser } from "@/hooks/useAuth";
import { CreateCompanyDialog } from "@/components/CreateCompanyDialog";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: CompanyStatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Deactivated" },
  { value: "all", label: "All" },
];

export function CompaniesPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatusFilter>("active");
  const deferredSearch = useDeferredValue(search);

  // Compliance officers get a focused view: only companies actually under
  // monitoring, always active — the raw sanctions directory (hundreds of
  // thousands of never-scanned entities) would swamp their daily workflow.
  // Admins get the full directory (they're the ones onboarding new
  // companies) with an explicit Active/Deactivated/All filter.
  const { data: companies, isLoading, isError, refetch } = useCompanies(
    deferredSearch,
    isAdmin ? statusFilter : "active",
    isAdmin ? "directory" : "monitored"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={
          isAdmin
            ? "Company directory — add new companies or review the existing roster."
            : "Companies currently under your monitoring portfolio."
        }
        action={
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {isAdmin && (
              <div className="inline-flex rounded-lg border border-border p-0.5">
                {STATUS_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      statusFilter === value
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isAdmin ? "Search the full dataset..." : "Search monitored companies..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {isAdmin && <CreateCompanyDialog />}
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
                  : isAdmin
                    ? "The company directory could not be loaded from the dataset."
                    : "Companies you run a compliance audit on will appear here."
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
                  {!isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
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
                      <MonitoringLifecycleBadge company={company} />
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={company.risk_level} />
                    </TableCell>
                    {!isAdmin && (
                      <TableCell className="text-right">
                        {company.is_active ? (
                          <Link
                            to={`/companies/${company.id}/execute`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <RefreshCw data-icon="inline-start" />
                            Run Compliance Audit
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" disabled title="This company is deactivated">
                            <RefreshCw data-icon="inline-start" />
                            Run Compliance Audit
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
