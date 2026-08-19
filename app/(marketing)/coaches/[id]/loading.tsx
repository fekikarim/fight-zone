import { Container } from "@/components/ui/container";

export default function CoachDetailLoading() {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mb-8">
          <div className="h-9 w-36 skeleton rounded" />
        </div>
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-10">
            <div className="flex items-start gap-6">
              <div className="h-24 w-24 shrink-0 skeleton rounded-full" />
              <div className="space-y-2">
                <div className="h-7 w-48 skeleton rounded" />
                <div className="h-4 w-64 skeleton rounded" />
                <div className="flex gap-2">
                  <div className="h-6 w-32 skeleton rounded-full" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-ink-border p-4">
                  <div className="h-5 w-5 shrink-0 skeleton rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-48 skeleton rounded" />
                    <div className="h-3 w-64 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-ink-border bg-ink-soft/20 p-6 space-y-5">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-12 w-full skeleton rounded" />
            <div className="h-12 w-full skeleton rounded" />
          </div>
        </div>
      </Container>
    </section>
  );
}
