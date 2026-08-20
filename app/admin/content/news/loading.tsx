export default function AdminNewsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-ink-soft" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-ink-soft" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border border-ink-border bg-ink-soft/30" />
        ))}
      </div>
    </div>
  );
}
