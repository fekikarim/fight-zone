export default function AdminMembershipsLoading() {
  return (
    <div className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-ink-soft" />
        <div className="h-4 w-72 animate-pulse rounded bg-ink-soft" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-ink-border bg-ink-soft/30" />
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-ink-border">
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse border-b border-ink-border/50 bg-ink-soft/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
