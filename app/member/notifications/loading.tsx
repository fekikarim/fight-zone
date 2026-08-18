import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MemberNotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </header>

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
    </div>
  );
}
