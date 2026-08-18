import { Suspense } from "react";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getNotificationCenter, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { notificationFilterSchema } from "@/lib/validations/notifications";
import { NotificationList } from "@/components/notifications/notification-list";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: "Notifications — Fight Zone" };

export default async function MemberNotificationsPage({ searchParams }: Props) {
  await requireUser();
  const params = await searchParams;

  const parsed = notificationFilterSchema.safeParse({
    type: typeof params.type === "string" ? params.type : undefined,
    unreadOnly: typeof params.filter === "string" ? params.filter === "unread" : undefined,
    cursor: typeof params.cursor === "string" ? params.cursor : undefined,
  });

  const filters = parsed.success ? parsed.data : {};

  const [page, unreadCount] = await Promise.all([
    getNotificationCenter({
      type: filters.type,
      unreadOnly: filters.unreadOnly,
      cursor: filters.cursor,
    }),
    getUnreadNotificationCount(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
            Notifications
          </h1>
          <p className="text-sm text-muted">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
      </header>

      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationList
          page={page}
          role="member"
          unreadCount={unreadCount}
        />
      </Suspense>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
