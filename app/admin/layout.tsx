import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { getUnreadMessageCount } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/content", label: "Content" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, unread] = await Promise.all([requireRole(["ADMIN", "COACH"]), getUnreadMessageCount()]);
  const nav = adminNav.map((item) =>
    item.href === "/admin/messages" ? { ...item, badge: unread } : item,
  );
  return (
    <DashboardShell user={user} nav={nav}>
      {children}
    </DashboardShell>
  );
}
