export default function AdminMembershipNewLoading() {
  return (
    <div className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-ink-soft" />
        <div className="h-8 w-56 animate-pulse rounded bg-ink-soft" />
      </div>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
        <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
        <div className="h-20 animate-pulse rounded-lg bg-ink-soft" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
          <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
          <div className="h-10 animate-pulse rounded-lg bg-ink-soft" />
        </div>
      </div>
    </div>
  );
}
