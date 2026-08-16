import { Container } from "@/components/ui/container";

export default function AdminLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-10 px-0">
      <div className="flex flex-col gap-2">
        <div className="h-10 w-56 animate-pulse rounded-md bg-ink-soft" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-ink-soft" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-ink-border bg-ink-soft/50" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl border border-ink-border bg-ink-soft/50 xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl border border-ink-border bg-ink-soft/50" />
      </div>
    </Container>
  );
}
