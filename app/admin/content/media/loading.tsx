export default function AdminMediaLoading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-48 animate-pulse rounded bg-ink-soft" />
      <div className="h-64 animate-pulse rounded-xl border border-ink-border bg-ink-soft/30" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video animate-pulse rounded-xl border border-ink-border bg-ink-soft/30" />
        ))}
      </div>
    </div>
  );
}
