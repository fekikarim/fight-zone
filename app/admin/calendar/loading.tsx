import { Container } from "@/components/ui/container";

export default function CalendarLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-6 px-6 sm:px-8">
      <div className="flex flex-col gap-3">
        <div className="h-9 w-44 animate-pulse rounded-md bg-ink-soft" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-ink-soft" />
      </div>
      <div className="h-11 w-full max-w-md animate-pulse rounded-lg bg-ink-soft" />
      <div className="grid h-72 animate-pulse grid-cols-7 gap-px rounded-xl border border-ink-border bg-ink-soft/40">
        {Array.from({ length: 28 }).map((_, index) => (
          <div key={index} className="bg-background" />
        ))}
      </div>
    </Container>
  );
}
