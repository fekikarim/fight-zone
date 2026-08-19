import { Container } from "@/components/ui/container";

export default function AdminSessionDetailLoading() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-4">
        <div className="h-9 w-36 skeleton rounded" />
        <div className="h-8 w-64 skeleton rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 skeleton rounded-full" />
          <div className="h-6 w-20 skeleton rounded-full" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="h-6 w-32 skeleton rounded" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-10 w-full skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-48 w-full skeleton rounded-xl" />
          <div className="h-32 w-full skeleton rounded-xl" />
        </div>
      </div>
    </Container>
  );
}
