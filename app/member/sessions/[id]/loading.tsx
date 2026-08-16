import { Skeleton } from "@/components/ui/skeleton";

export default function SessionDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-9 w-28 skeleton rounded" />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <div className="flex flex-col gap-3">
            <div className="h-6 w-24 skeleton rounded" />
            <div className="h-9 w-3/4 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-4 rounded-xl border border-ink-border bg-ink-soft/60 p-5">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6">
            <Skeleton className="h-7 w-40" />
            <div className="mt-5 flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="mt-3 h-4 w-32" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="mt-3 h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
