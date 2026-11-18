import { Container } from "@/components/ui/container";

const block = "animate-pulse rounded-md bg-ink-soft";
const card = "animate-pulse rounded-xl border border-ink-border bg-ink-soft/50";

function Heading() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <div className={`h-9 w-48 ${block}`} />
      <div className={`h-4 w-full max-w-md ${block}`} />
    </div>
  );
}

/** Skeleton for list pages (events, schedule). */
export function ListPageSkeleton({ rows = 6, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0" role="status" aria-label={label}>
      <Heading />
      <div className="flex flex-col divide-y divide-ink-border rounded-xl border border-ink-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className={`h-9 w-9 shrink-0 rounded-lg ${block}`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`h-4 w-2/3 max-w-xs ${block}`} />
              <div className={`h-3 w-1/3 max-w-[10rem] ${block}`} />
            </div>
            <div className={`hidden h-6 w-20 rounded-full sm:block ${block}`} />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </Container>
  );
}

/** Skeleton for create/edit form pages. */
export function FormPageSkeleton({ label = "Loading form…" }: { label?: string }) {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0" role="status" aria-label={label}>
      <Heading />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className={`h-4 w-24 ${block}`} />
            <div className={`h-11 w-full ${block}`} />
          </div>
        ))}
        <div className={`h-40 ${card}`} />
        <div className={`h-11 w-40 self-end ${block}`} />
      </div>
      <span className="sr-only">{label}</span>
    </Container>
  );
}

/** Skeleton for event detail pages. */
export function DetailPageSkeleton({ label = "Loading event…" }: { label?: string }) {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0" role="status" aria-label={label}>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-6 w-20 rounded-full ${block}`} />
        ))}
      </div>
      <div className={`h-10 w-full max-w-lg ${block}`} />
      <div className={`aspect-[16/7] w-full ${card}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-20 ${card}`} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </Container>
  );
}
