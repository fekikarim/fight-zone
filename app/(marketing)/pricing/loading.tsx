export default function PricingLoading() {
  return (
    <>
      <section className="border-b border-ink-border bg-ink-soft/40 pt-32 pb-16 sm:pt-40">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-ink-soft" />
          <div className="mx-auto mt-6 h-10 w-72 animate-pulse rounded bg-ink-soft sm:h-14 sm:w-96" />
          <div className="mx-auto mt-4 h-6 w-80 animate-pulse rounded bg-ink-soft" />
        </div>
      </section>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 h-10 w-64 animate-pulse rounded-xl bg-ink-soft" />
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl border border-ink-border bg-ink-soft/50" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
