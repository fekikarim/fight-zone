import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Logo variant="full" tone="light" />
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-7xl font-bold text-primary">404</p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          Round not found
        </h1>
        <p className="max-w-md text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist — it may have moved
          or never made it into the ring.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Back home
      </Link>
    </div>
  );
}
