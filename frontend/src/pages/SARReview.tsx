import { Card, CardContent } from "@/components/ui/card";

export function SARReview() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">SAR Review</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No SAR reports pending review.</p>
        </CardContent>
      </Card>
    </div>
  );
}
