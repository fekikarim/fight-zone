import { Skeleton } from "@/components/ui/skeleton";

export default function BookingDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-9 w-28 skeleton rounded" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6">
            <Skeleton className="h-6 w-24" />
            <div className="mt-5 flex flex-col gap-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="mt-5 h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
