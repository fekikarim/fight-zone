import type { Metadata } from "next";
import Image from "next/image";
import { MemberSessionCard, type MemberSessionItem } from "@/components/member/session-card";
import { getActiveSessions } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Sessions",
  description: "Browse Fight Zone coaching sessions and book your next one.",
};

export default async function MemberSessionsPage() {
  const sessions = await getActiveSessions();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Coaching sessions
        </h1>
        <p className="text-sm text-muted">
          Pick a session, choose your preferred time, and request a booking.
        </p>
      </div>

      {sessions.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <MemberSessionCard key={session.id} session={session as MemberSessionItem} />
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40 p-8 sm:p-14 mt-4">
          <div className="absolute right-0 top-0 h-full w-full opacity-10 sm:w-1/2">
            <Image src="/components/fit-cartoon-women-lifting-training-4096x4096.jpg" alt="Training" fill className="object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-soft via-ink-soft/90 to-transparent sm:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-soft/40 via-ink-soft/80 to-transparent sm:block" />
          </div>
          <div className="relative z-10 flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              Preparing the next round
            </h2>
            <p className="text-base text-zinc-300">
              No sessions are currently available. Check back soon — new professional coaching sessions are being added to the platform.
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
