import { Logo } from "@/components/logo";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background">
      <Logo variant="full" className="animate-fade-up" />
      <div className="flex items-center gap-3 text-sm text-muted">
        <Spinner size="sm" />
        Loading…
      </div>
    </div>
  );
}
