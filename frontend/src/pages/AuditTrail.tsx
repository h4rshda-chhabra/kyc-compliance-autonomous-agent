import { Card, CardContent } from "@/components/ui/card";

export function AuditTrail() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
