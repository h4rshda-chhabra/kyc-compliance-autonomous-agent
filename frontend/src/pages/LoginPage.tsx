import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useLogin } from "@/hooks/useAuth";
import { SESSION_EXPIRED_KEY } from "@/services/apiClient";

function readAndClearSessionExpired(): boolean {
  const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1";
  if (expired) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return expired;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSessionExpired, setShowSessionExpired] = useState(readAndClearSessionExpired);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: LoginErrors = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setFormError(null);
    try {
      await login.mutateAsync({ email, password });
      navigate("/");
    } catch {
      setFormError("Incorrect email or password.");
    }
  }

  async function handleExploreDemo() {
    setDemoLoading(true);
    setFormError(null);
    try {
      await login.mutateAsync({ email: "demo@example.com", password: "password123" });
      navigate("/");
    } catch {
      setFormError("Couldn't sign in to the demo account. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  const busy = login.isPending || demoLoading;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your compliance workspace.
        </p>
      </div>

      {showSessionExpired ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <span>Your session has expired. Please sign in again.</span>
          <button
            type="button"
            onClick={() => setShowSessionExpired(false)}
            aria-label="Dismiss"
            className="shrink-0 text-amber-800/70 hover:text-amber-800 dark:text-amber-400/70 dark:hover:text-amber-400"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {formError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/login"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked === true)}
          />
          <Label htmlFor="remember" className="font-normal text-muted-foreground">
            Remember me
          </Label>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {login.isPending ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={handleExploreDemo}
      >
        {demoLoading ? (
          <>
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
            Loading demo...
          </>
        ) : (
          <>
            <Sparkles data-icon="inline-start" />
            Explore the demo
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
