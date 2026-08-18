import { Bell } from "lucide-react";
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
