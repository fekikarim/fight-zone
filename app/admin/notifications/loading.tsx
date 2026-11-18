import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsSkeleton } from "@/components/notifications/notifications-page";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <NotificationsSkeleton />
    </div>
  );
}
