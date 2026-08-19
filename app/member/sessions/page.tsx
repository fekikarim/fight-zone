import type { Metadata } from "next";
import { MemberSessionCard, type MemberSessionItem } from "@/components/member/session-card";
import { EmptyState } from "@/components/empty-state";
import { getActiveSessions } from "@/lib/supabase/queries";
import { CalendarDays } from "lucide-react";
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
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" aria-hidden />}
          title="No sessions available"
          description="Check back soon — new coaching sessions are being added."
        />
      )}
    </Container>
  );
}
