import { Skeleton } from "@/components/ui/skeleton";

export default function MemberMessagesLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-56 skeleton rounded" />
        <div className="h-4 w-80 skeleton rounded" />
      </div>
      <div className="h-16 rounded-xl skeleton" />
      <div className="flex flex-col divide-y divide-ink-border overflow-hidden rounded-xl border border-ink-border bg-ink-soft/40">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
