import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, TriangleAlert } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const highlights = [
  {
    icon: Activity,
    title: "Continuous monitoring",
    description: "Autonomous agents re-screen your portfolio around the clock.",
  },
  {
    icon: TriangleAlert,
    title: "Risk-first alerts",
    description: "Surface high-risk entities the moment findings emerge.",
  },
  {
    icon: ShieldCheck,
    title: "Audit-ready by default",
    description: "Every action is recorded in an immutable audit trail.",
  },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      {/* Form side */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">KYC Auditor</p>
              <p className="text-xs text-muted-foreground">Continuous Compliance</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-sm"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>

      {/* Brand side */}
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div />
        <div className="space-y-10">
          <blockquote className="space-y-3">
            <p className="text-2xl font-semibold leading-snug">
              Compliance that never sleeps.
            </p>
            <p className="max-w-md text-sm text-primary-foreground/70">
              The Continuous KYC Autonomous Auditor keeps every entity in your
              portfolio under constant, explainable review.
            </p>
          </blockquote>
          <ul className="space-y-6">
            {highlights.map(({ icon: Icon, title, description }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.1, ease: "easeOut" }}
                className="flex items-start gap-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-primary-foreground/60">{description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Continuous KYC Autonomous Auditor
        </p>
      </div>
    </div>
  );
}
