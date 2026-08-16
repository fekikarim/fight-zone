import { Skeleton } from "@/components/ui/skeleton";

export default function MemberBookingsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-56 skeleton rounded" />
        <div className="h-4 w-72 skeleton rounded" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-soft/50 p-5"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
