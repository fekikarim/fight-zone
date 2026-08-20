export default function AdminAchievementsLoading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-64 animate-pulse rounded bg-ink-soft" />
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
        <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
        <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-ink-border bg-ink-soft/30" />
        ))}
      </div>
    </div>
  );
}
