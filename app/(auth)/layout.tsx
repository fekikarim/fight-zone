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
      <div className="relative flex min-h-dvh flex-col bg-ink max-lg:bg-[#09090a]">
        {/* Phone hero: brand image, logo and a way back, fading into the card */}
        <div className="relative h-[184px] shrink-0 overflow-hidden min-[700px]:h-[216px] lg:hidden">
          <div className="duotone absolute inset-0">
            <Image src="/components/event/kickboxing.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[22%_40%]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/55 to-[#09090a]" aria-hidden />
          <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <Logo variant="full" />
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-ink/50 px-3.5 text-xs font-semibold text-foreground/90 backdrop-blur-md transition-colors hover:bg-ink/70"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Site
              </Link>
            </div>
            <p className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight">
              Your corner,<br /><span className="text-primary-readable">online.</span>
            </p>
          </div>
        </div>

        <header className="hidden items-center justify-between px-8 py-5 lg:flex">
          <span className="invisible"><Logo variant="full" /></span>
          <Link
            href="/"
            className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            Back to site
          </Link>
        </header>

        <main
          id="main"
          className="relative z-10 flex flex-1 justify-center px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] max-lg:-mt-8 max-lg:rounded-t-[32px] max-lg:border-t max-lg:border-white/[0.08] max-lg:bg-[#0e0e10] max-lg:pt-8 max-lg:shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)] sm:px-8 lg:items-center lg:pb-16"
        >
          <div className="w-full max-w-[26rem] animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
