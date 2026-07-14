import { Card, CardContent } from "@/components/ui/card";

export function Evidence() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Evidence</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No evidence collected yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
