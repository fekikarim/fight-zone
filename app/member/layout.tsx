import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { getUnreadMessageCount, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const memberNav = [
  { href: "/member", label: "Overview" },
  { href: "/member/sessions", label: "Sessions" },
  { href: "/member/schedule", label: "Schedule" },
  { href: "/member/bookings", label: "My Bookings" },
  { href: "/member/events", label: "Events" },
  { href: "/member/messages", label: "Messages" },
  { href: "/member/notifications", label: "Notifications" },
  { href: "/member/profile", label: "Profile" },
];

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const [user, unread, unreadNotifications] = await Promise.all([
    requireUser(),
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
  ]);
  const nav = memberNav.map((item) => {
    if (item.href === "/member/messages") return { ...item, badge: unread };
    if (item.href === "/member/notifications") return { ...item, badge: unreadNotifications };
    return item;
  });
  return (
    <DashboardShell user={user} nav={nav}>
      {children}
    </DashboardShell>
  );
}
