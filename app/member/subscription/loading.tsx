export default function MemberSubscriptionLoading() {
  return (
    <div className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-ink-soft" />
        <div className="h-4 w-64 animate-pulse rounded bg-ink-soft" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-ink-border bg-ink-soft/30" />
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-ink-soft" />
        <div className="h-40 animate-pulse rounded-xl border border-ink-border bg-ink-soft/30" />
      </div>
    </div>
  );
}
