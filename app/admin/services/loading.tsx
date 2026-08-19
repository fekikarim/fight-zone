import { Container } from "@/components/ui/container";

export default function AdminServicesLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 skeleton rounded" />
          <div className="h-4 w-56 skeleton rounded" />
        </div>
        <div className="h-9 w-32 skeleton rounded" />
      </div>
      <div className="divide-y divide-ink-border rounded-xl border border-ink-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-5 w-5 skeleton rounded" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-4 w-48 skeleton rounded" />
              <div className="h-3 w-64 skeleton rounded" />
            </div>
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-5 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </Container>
  );
}
