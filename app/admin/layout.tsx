import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/errors";
import { getUnreadMessageCount, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AccessDenied } from "@/components/dashboard/access-denied";

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
  let user;
  try {
    user = await requireRole(["ADMIN", "COACH"]);
  } catch (error) {
    // Signed-in but unauthorized: render the distinct access-denied state
    // instead of surfacing a fatal error. Unauthenticated visitors were
    // already redirected to /sign-in by requireUser inside requireRole.
    if (error instanceof ForbiddenError) {
      return <AccessDenied returnHref="/member" returnLabel="Back to member area" />;
    }
    throw error;
  }
  const [unread, unreadNotifications] = await Promise.all([
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
