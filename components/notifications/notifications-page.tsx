import { Suspense } from "react";
import { getNotificationCenter, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { parseNotificationFilter } from "@/lib/validations/notifications";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PushToggle } from "@/components/notifications/push-toggle";
import { InstallAppCard } from "@/components/notifications/install-app-card";

interface NotificationsPageProps {
  role: "member" | "staff";
  searchParams: Record<string, string | string[] | undefined>;
}

/** Shared notification center (member + admin). Filter lives in `?filter=`. */
export async function NotificationsPage({ role, searchParams }: NotificationsPageProps) {
  const filter = typeof searchParams.filter === "string" ? searchParams.filter : "";
  const filters = parseNotificationFilter(filter);

  const [page, unreadCount] = await Promise.all([
    getNotificationCenter(filters),
    getUnreadNotificationCount(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
            : "You're all caught up."
        }
      />
      <InstallAppCard />
      <PushToggle />
      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationList
          // Remount on new server data (filter change, mark read) so the
          // client-side list never shows stale read states.
          key={`${filter}:${unreadCount}:${page.items[0]?.id ?? "none"}`}
          page={page}
          role={role}
          unreadCount={unreadCount}
          filter={filter}
          filters={filters}
        />
      </Suspense>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-ink-border px-4 py-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
