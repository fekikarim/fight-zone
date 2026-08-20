import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { getUnreadMessageCount, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/memberships", label: "Memberships" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/content", label: "Content" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, unread, unreadNotifications] = await Promise.all([
    requireRole(["ADMIN", "COACH"]),
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
  ]);
  const nav = adminNav.map((item) => {
    if (item.href === "/admin/messages") return { ...item, badge: unread };
    if (item.href === "/admin/notifications") return { ...item, badge: unreadNotifications };
    return item;
  });
  return (
    <DashboardShell user={user} nav={nav}>
      {children}
    </DashboardShell>
  );
}
