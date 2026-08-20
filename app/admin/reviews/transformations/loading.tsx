export default function AdminTransformationsLoading() {
  return (
    <div className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-ink-soft" />
        <div className="h-4 w-72 animate-pulse rounded bg-ink-soft" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-ink-border bg-ink-soft/30"
          />
        ))}
      </div>
    </div>
  );
}
