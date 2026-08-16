import { Skeleton } from "@/components/ui/skeleton";

export default function MemberProfileLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-48 skeleton rounded" />
        <div className="h-4 w-80 skeleton rounded" />
      </div>
      <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-8">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-5 w-48" />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
          <Skeleton className="h-12 w-36 self-end" />
        </div>
      </div>
    </div>
  );
}
