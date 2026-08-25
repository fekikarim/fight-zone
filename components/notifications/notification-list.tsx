import { Bell } from "lucide-react";
import Image from "next/image";
import { EmptyState } from "@/components/empty-state";
import { NotificationItem } from "./notification-item";
import { MarkAllReadButton } from "./mark-all-read-button";
import { NotificationFilters } from "./notification-filters";
import { LoadMoreNotifications } from "./load-more-notifications";
import type { NotificationPage } from "@/lib/types/notifications";

interface NotificationListProps {
  page: NotificationPage;
  role: "member" | "staff";
  unreadCount: number;
  filterLabel?: string;
}

export function NotificationList({
  page,
  role,
  unreadCount,
}: NotificationListProps) {
  const hasNotifications = page.items.length > 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NotificationFilters unreadCount={unreadCount} />
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      {hasNotifications ? (
        <div className="space-y-1">
          {page.items.map((n) => (
            <NotificationItem key={n.id} notification={n} role={role} />
          ))}
        </div>
      ) : role === "member" ? (
        <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40 p-8 sm:p-14 mt-4">
          <div className="absolute right-0 top-0 h-full w-full opacity-10 sm:w-1/2">
            <Image src="/components/flat-sport-medals-illustration-2000x2000.jpg" alt="Medals" fill className="object-cover object-right grayscale mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-soft via-ink-soft/90 to-transparent sm:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-soft/40 via-ink-soft/80 to-transparent sm:block" />
          </div>
          <div className="relative z-10 flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              You're in the zone
            </h2>
            <p className="text-base text-zinc-300">
              No new alerts right now. Notifications about your bookings and messages from Coach Seif will appear here.
            </p>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications"
          description="You're all caught up. Notifications will appear here when there's activity on your bookings and messages."
        />
      )}

      <LoadMoreNotifications nextCursor={page.nextCursor} />
    </div>
  );
}
