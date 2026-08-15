import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="absolute inset-0 grid-pattern opacity-[0.06]" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-soft/60 via-background to-background" aria-hidden />

      <header className="relative z-10 py-6">
        <Container className="flex items-center justify-between">
          <Logo variant="full" tone="light" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </Container>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
