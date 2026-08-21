import { Skeleton } from "@/components/ui/skeleton";

export default function AboutLoading() {
  return (
    <div className="min-h-dvh bg-background pt-32">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Skeleton className="mx-auto h-6 w-32" />
        <Skeleton className="mx-auto mt-3 h-10 w-72" />
        <Skeleton className="mx-auto mt-2 h-4 w-96" />
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
