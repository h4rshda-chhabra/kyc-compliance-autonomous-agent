import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// SAR Reviews and Deactivation Requests both point at /reviews — that page
// already renders the compliance-officer queue or the admin queue depending
// on the logged-in user's role, so only the nav label differs here.
function navItemsForRole(isAdmin: boolean) {
  return [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/companies", label: "Companies", icon: Building2 },
    {
      to: "/reviews",
      label: isAdmin ? "Deactivation Requests" : "SAR Reviews",
      icon: ClipboardList,
    },
    { to: "/audit", label: "Timeline", icon: ScrollText },
  ];
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: currentUser } = useCurrentUser();
  const navItems = navItemsForRole(currentUser?.role === "ADMIN");

  async function handleLogout() {
    await logout.mutateAsync().catch(() => undefined);
    navigate("/login");
  }

  return (
    <div className="min-h-svh bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">KYC Auditor</p>
            <p className="text-xs text-muted-foreground">Continuous Compliance</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <UserMenu variant="full" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="flex-1 justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut data-icon="inline-start" />
              Log out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <p className="text-sm font-semibold text-foreground">KYC Auditor</p>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu variant="compact" />
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-1 py-2 backdrop-blur-sm lg:hidden">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
