import { Container } from "@/components/ui/container";

export default function CoachesLoading() {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mb-10 space-y-3">
          <div className="h-3 w-16 skeleton rounded" />
          <div className="h-8 w-48 skeleton rounded" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-ink-border">
              <div className="h-48 skeleton" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-32 skeleton rounded" />
                <div className="h-4 w-48 skeleton rounded" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 skeleton rounded-full" />
                </div>
                <div className="h-4 w-full skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
