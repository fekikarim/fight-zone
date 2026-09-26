import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/errors";
import { getUnreadMessageCount, getUnreadNotificationCount, getContentFreshness } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DailyMotivationGate } from "@/components/motivation/daily-motivation-gate";

const memberNav = [
  { href: "/member", label: "Overview" },
  { href: "/member/schedule", label: "Schedule" },
  { href: "/member/events", label: "Events" },
  { href: "/member/reviews", label: "My Reviews" },
  { href: "/member/messages", label: "Messages" },
  { href: "/member/notifications", label: "Notifications" },
  { href: "/member/profile", label: "Profile" },
];

export default async function MemberLayout({ children }: { children: ReactNode }) {
  // MEMBER-only shell: coaches/staff use /admin, never the member dashboard.
  // A signed-in non-member landing here (e.g. via a stale link) is sent to
  // the right home instead of an error page; genuinely unexpected failures
  // still throw to the error boundary.
  let user: Awaited<ReturnType<typeof requireRole>>;
  try {
    user = await requireRole(["MEMBER"]);
  } catch (error) {
    if (!(error instanceof ForbiddenError)) throw error;
    const current = await getCurrentUser();
    const staff = current?.roles.some((role) => role === "ADMIN" || role === "COACH") ?? false;
    redirect(staff ? "/admin" : "/");
  }
  const [unread, unreadNotifications, freshness] = await Promise.all([
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
    getContentFreshness(),
  ]);
  const nav = memberNav.map((item) => {
    if (item.href === "/member/messages") return { ...item, badge: unread };
    if (item.href === "/member/notifications") return { ...item, badge: unreadNotifications };
    return item;
  });
  const firstName = user.fullName?.split(" ")[0] ?? undefined;
  return (
    <DashboardShell user={user} nav={nav} freshness={freshness}>
      {children}
      <DailyMotivationGate userFirstName={firstName} />
    </DashboardShell>
  );
}
