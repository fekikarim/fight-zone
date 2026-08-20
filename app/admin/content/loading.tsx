export default function AdminContentLoading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-48 animate-pulse rounded bg-ink-soft" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-ink-border bg-ink-soft/30" />
        ))}
      </div>
    </div>
  );
}
