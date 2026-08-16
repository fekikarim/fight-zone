import { Skeleton } from "@/components/ui/skeleton";

export default function MemberDashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-72 skeleton rounded" />
        <div className="h-4 w-80 skeleton rounded" />
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-soft/50 p-6"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-14" />
            </div>
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-6 w-44" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-soft/60 p-4"
            >
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-soft/60 p-4"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-44" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
