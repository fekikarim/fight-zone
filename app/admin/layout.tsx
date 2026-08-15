import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/content", label: "Content" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["ADMIN", "COACH"]);
  return (
    <DashboardShell user={user} nav={adminNav}>
      {children}
    </DashboardShell>
  );
}
