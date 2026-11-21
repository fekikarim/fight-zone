import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, MessageSquare, Medal, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";

/** What an account actually unlocks in V1 (no invented perks). */
const PERKS = [
  { icon: CalendarCheck, label: "Register for events and see your place instantly" },
  { icon: Wallet, label: "Choose how you pay and follow its confirmation" },
  { icon: MessageSquare, label: "Talk to Coach Seif in your private conversation" },
  { icon: Medal, label: "Earn badges for every event you attend" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden border-r border-ink-border lg:flex lg:flex-col">
        <div className="duotone absolute inset-0">
          <Image
            src="/components/event/kickboxing.jpg"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-[18%_50%]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" aria-hidden />
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Logo variant="full" />
          <div>
            <p className="type-overline flex items-center gap-3 text-foreground/80">
              <span className="slant-bar" aria-hidden />
              Boxing · Kickboxing · Fitness
            </p>
            <p className="type-h1 mt-5 max-w-md">Your corner,<br />online.</p>
            <ul className="mt-8 grid max-w-md gap-3">
              {PERKS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-3 text-sm text-foreground/85">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <span className="lg:invisible"><Logo variant="full" /></span>
          <Link
            href="/"
            className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            Back to site
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-[26rem] animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
