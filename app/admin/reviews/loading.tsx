export default function AdminReviewsLoading() {
  return (
    <div className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-ink-soft" />
        <div className="h-4 w-72 animate-pulse rounded bg-ink-soft" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-ink-soft" />
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-ink-border">
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse border-b border-ink-border/50 bg-ink-soft/20"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
