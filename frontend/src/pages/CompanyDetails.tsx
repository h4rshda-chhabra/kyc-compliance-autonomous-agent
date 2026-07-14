import { useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Company Details</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Company ID</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{companyId}</p>
        </CardContent>
      </Card>
    </div>
  );
}
