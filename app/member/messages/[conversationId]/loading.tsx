import { Skeleton } from "@/components/ui/skeleton";

export default function MemberMessageThreadLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-9 w-32 skeleton rounded" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-soft/30 p-5">
        <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
        <Skeleton className="h-10 w-1/2 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-3/5 rounded-2xl" />
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
    </div>
  );
}
