import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/errors";
import { getUnreadMessageCount, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { getPendingProofCount } from "@/lib/payments/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AccessDenied } from "@/components/dashboard/access-denied";

const adminNav = [
  { href: "/admin", label: "Overview", group: "Operate" },
  { href: "/admin/events", label: "Events", group: "Operate" },
  { href: "/admin/calendar", label: "Calendar", group: "Operate" },
  { href: "/admin/payments", label: "Payments", group: "Operate" },
  { href: "/admin/members", label: "Members", group: "Operate" },
  { href: "/admin/messages", label: "Messages", group: "Engage" },
  { href: "/admin/notifications", label: "Notifications", group: "Engage" },
  { href: "/admin/badges", label: "Badges & rewards", group: "Engage" },
  { href: "/admin/reviews", label: "Reviews", group: "Engage" },
  { href: "/admin/news", label: "News", group: "Publish" },
  { href: "/admin/content", label: "Site content", group: "Publish" },
  { href: "/admin/reports", label: "Reports", group: "Insight" },
  { href: "/admin/settings", label: "Settings", group: "Insight" },
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
  const [unread, unreadNotifications, pendingProofs] = await Promise.all([
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
    getPendingProofCount(),
  ]);
  const nav = adminNav.map((item) => {
    if (item.href === "/admin/messages") return { ...item, badge: unread };
    if (item.href === "/admin/notifications") return { ...item, badge: unreadNotifications };
    if (item.href === "/admin/payments") return { ...item, badge: pendingProofs };
    return item;
  });
  return (
    <DashboardShell user={user} nav={nav}>
      {children}
    </DashboardShell>
  );
}
