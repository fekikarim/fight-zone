import { Container } from "@/components/ui/container";

export default function AdminBookingsLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <div className="h-10 w-48 animate-pulse rounded-md bg-ink-soft" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-ink-soft" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[auto_auto_auto_1fr_auto]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-md bg-ink-soft" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-ink-soft/60" />
        ))}
      </div>
    </Container>
  );
}
