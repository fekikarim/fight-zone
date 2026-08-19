import { Container } from "@/components/ui/container";

export default function SessionDetailLoading() {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mb-8">
          <div className="h-9 w-36 skeleton rounded" />
        </div>
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-ink-border bg-ink-soft/30 p-4">
                  <div className="mb-2 h-3 w-16 skeleton rounded" />
                  <div className="h-6 w-20 skeleton rounded" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-24 skeleton rounded-full" />
              <div className="h-6 w-32 skeleton rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full skeleton rounded" />
              <div className="h-4 w-5/6 skeleton rounded" />
              <div className="h-4 w-4/6 skeleton rounded" />
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-ink-border p-5">
              <div className="h-16 w-16 shrink-0 skeleton rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 skeleton rounded" />
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-4 w-64 skeleton rounded" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-ink-border bg-ink-soft/20 p-6 space-y-5">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-8 w-24 skeleton rounded" />
            <div className="h-12 w-full skeleton rounded" />
          </div>
        </div>
      </Container>
    </section>
  );
}
