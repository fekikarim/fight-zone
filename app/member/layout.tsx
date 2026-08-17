import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { getUnreadMessageCount } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const memberNav = [
  { href: "/member", label: "Overview" },
  { href: "/member/sessions", label: "Sessions" },
  { href: "/member/bookings", label: "My Bookings" },
  { href: "/member/messages", label: "Messages" },
  { href: "/member/profile", label: "Profile" },
];

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const [user, unread] = await Promise.all([requireUser(), getUnreadMessageCount()]);
  const nav = memberNav.map((item) =>
    item.href === "/member/messages" ? { ...item, badge: unread } : item,
  );
  return (
    <DashboardShell user={user} nav={nav}>
      {children}
    </DashboardShell>
  );
}
