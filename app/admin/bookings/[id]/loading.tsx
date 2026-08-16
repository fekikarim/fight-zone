import { Container } from "@/components/ui/container";

export default function AdminBookingDetailLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-4">
        <div className="h-9 w-28 animate-pulse rounded-md bg-ink-soft" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-64 animate-pulse rounded-md bg-ink-soft" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-ink-soft" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-xl border border-ink-border bg-ink-soft/50" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-ink-border bg-ink-soft/50" />
      </div>
    </Container>
  );
}
