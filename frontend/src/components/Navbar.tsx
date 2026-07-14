import { NavLink } from "react-router-dom";

import { cn } from "@/utils/cn";

const NAV_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/companies", label: "Companies" },
  { to: "/monitoring", label: "Monitoring" },
  { to: "/risk", label: "Risk" },
  { to: "/timeline", label: "Timeline" },
  { to: "/evidence", label: "Evidence" },
  { to: "/sar-review", label: "SAR Review" },
  { to: "/audit-trail", label: "Audit Trail" },
] as const;

export function Navbar() {
  return (
    <header className="border-b border-border">
      <div className="container flex h-14 items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">Continuous KYC Auditor</span>
        <nav className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "text-sm text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "font-medium text-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
