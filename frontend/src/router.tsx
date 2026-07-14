import { createBrowserRouter } from "react-router-dom";

import { MainLayout } from "@/layouts/MainLayout";
import { AuditTrail } from "@/pages/AuditTrail";
import { Companies } from "@/pages/Companies";
import { CompanyDetails } from "@/pages/CompanyDetails";
import { Dashboard } from "@/pages/Dashboard";
import { Evidence } from "@/pages/Evidence";
import { Login } from "@/pages/Login";
import { Monitoring } from "@/pages/Monitoring";
import { Risk } from "@/pages/Risk";
import { SARReview } from "@/pages/SARReview";
import { Timeline } from "@/pages/Timeline";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "companies", element: <Companies /> },
      { path: "companies/:companyId", element: <CompanyDetails /> },
      { path: "monitoring", element: <Monitoring /> },
      { path: "risk", element: <Risk /> },
      { path: "timeline", element: <Timeline /> },
      { path: "evidence", element: <Evidence /> },
      { path: "sar-review", element: <SARReview /> },
      { path: "audit-trail", element: <AuditTrail /> },
    ],
  },
]);
