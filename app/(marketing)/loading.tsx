import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="min-h-dvh bg-background pt-32">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto mt-3 h-10 w-80" />
        <Skeleton className="mx-auto mt-2 h-4 w-96" />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
