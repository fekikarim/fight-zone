import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";

export default function MemberDashboardLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-10 px-0 pb-12">
      {/* 1. Personal Welcome Skeleton */}
      <section className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40">
        <div className="relative z-10 flex flex-col gap-6 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex max-w-2xl flex-col gap-4">
            <Skeleton className="h-10 w-3/4 max-w-sm rounded-md" />
            <Skeleton className="h-6 w-1/2 rounded-md" />
            <Skeleton className="h-12 w-full max-w-md rounded-md" />
          </div>
        </div>
      </section>

      {/* Quick Stats & Membership Skeleton */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-xl border border-ink-border bg-ink-soft/30 px-5 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
        <div className="sm:col-span-2 flex h-full items-center justify-between rounded-xl border border-ink-border bg-ink-soft/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </section>

      {/* 2. My Fight Zone Today Skeleton */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Next Session & Bookings */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="rounded-xl border border-ink-border bg-ink-soft/30 p-6">
            <Skeleton className="h-6 w-20 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-ink-border bg-ink-soft/40 px-4 py-3">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-40" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-3 rounded-lg border border-ink-border bg-ink-soft/40 px-4 py-3.5">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Discover What's Happening Skeleton */}
      <section className="flex flex-col gap-6 pt-6">
        <Skeleton className="h-8 w-64 border-b border-ink-border pb-4" />
        <div className="grid gap-6 md:grid-cols-2">
          {/* News */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
          {/* Events */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
}
