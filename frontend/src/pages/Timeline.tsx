import { Card, CardContent } from "@/components/ui/card";

export function Timeline() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
