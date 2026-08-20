export default function MemberReviewsLoading() {
  return (
    <div className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-ink-soft" />
        <div className="h-8 w-48 animate-pulse rounded bg-ink-soft" />
        <div className="h-4 w-72 animate-pulse rounded bg-ink-soft" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-ink-border">
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse border-b border-ink-border/50 bg-ink-soft/20"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
