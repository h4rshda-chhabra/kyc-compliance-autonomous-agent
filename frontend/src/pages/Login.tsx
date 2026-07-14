import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Login() {
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
            <input
              type="email"
              placeholder="Email"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              type="password"
              placeholder="Password"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
            <Button type="submit" className="mt-2">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
