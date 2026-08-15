import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const memberNav = [{ href: "/member", label: "Overview" }];

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <DashboardShell user={user} nav={memberNav}>
      {children}
    </DashboardShell>
  );
}
