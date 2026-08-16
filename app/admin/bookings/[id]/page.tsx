import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  Clock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { getAdminBookingById } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { BookingActionsPanel } from "@/components/admin/booking-actions-panel";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const booking = await getAdminBookingById(id);
  return {
    title: booking.sessions?.title
      ? `Booking — ${booking.sessions.title}`
      : "Booking",
    description: "Booking details and management actions.",
  };
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
        {icon}
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Full booking detail for coach/admin: booking, member, session and coach
 * sections plus the state-dependent action panel. Read access is RLS-scoped.
 */
export default async function AdminBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const booking = await getAdminBookingById(id);

  const member = booking.member_profiles;
  const memberProfile = member?.profiles;
  const session = booking.sessions;
  const coach = booking.coach_profiles;
  const coachProfile = coach?.profiles;

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href="/admin/bookings">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to bookings
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            {session?.title ?? "Session booking"}
          </h1>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="max-w-2xl text-sm text-muted">
          Booking reference <span className="font-mono text-foreground">{booking.id}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6">
            <h2 className="mb-5 font-display text-lg font-bold uppercase tracking-wide">Booking</h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailRow icon={<CalendarClock className="h-4 w-4 text-primary" aria-hidden />} label="Scheduled for">
                {formatDate(booking.scheduled_at, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </DetailRow>
              <DetailRow icon={<Clock className="h-4 w-4 text-primary" aria-hidden />} label="Requested">
                {formatDate(booking.created_at, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </DetailRow>
              <DetailRow icon={<Clock className="h-4 w-4 text-primary" aria-hidden />} label="Last updated">
                {formatDate(booking.updated_at, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </DetailRow>
              <DetailRow icon={<CalendarClock className="h-4 w-4 text-primary" aria-hidden />} label="Requested session">
                {session ? `${session.title} (${formatPrice(Number(session.price))})` : "Session removed"}
              </DetailRow>
            </dl>
            {booking.notes ? (
              <div className="mt-5 rounded-lg border border-ink-border bg-background/60 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{booking.notes}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
              <User className="h-5 w-5 text-primary" aria-hidden />
              Member
            </h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailRow icon={<User className="h-4 w-4 text-primary" aria-hidden />} label="Name">
                {memberProfile?.full_name ?? "Unnamed member"}
              </DetailRow>
              <DetailRow icon={<Mail className="h-4 w-4 text-primary" aria-hidden />} label="Email">
                {memberProfile?.email ?? "—"}
              </DetailRow>
              <DetailRow icon={<Phone className="h-4 w-4 text-primary" aria-hidden />} label="Phone">
                {memberProfile?.phone ?? "—"}
              </DetailRow>
              <DetailRow icon={<User className="h-4 w-4 text-primary" aria-hidden />} label="Skill level">
                {member?.skill_level ?? "—"}
              </DetailRow>
            </dl>
          </section>

          <section className="rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6">
            <h2 className="mb-5 font-display text-lg font-bold uppercase tracking-wide">Session</h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailRow icon={<CalendarClock className="h-4 w-4 text-primary" aria-hidden />} label="Title">
                {session?.title ?? "Session removed"}
              </DetailRow>
              <DetailRow icon={<CircleDollarSign className="h-4 w-4 text-primary" aria-hidden />} label="Price">
                {session ? formatPrice(Number(session.price)) : "—"}
              </DetailRow>
              <DetailRow icon={<Clock className="h-4 w-4 text-primary" aria-hidden />} label="Duration">
                {session ? `${session.duration_min} minutes` : "—"}
              </DetailRow>
              <DetailRow icon={<User className="h-4 w-4 text-primary" aria-hidden />} label="Type">
                {session?.type ?? "—"}
              </DetailRow>
            </dl>
            {session?.description ? (
              <p className="mt-5 text-sm text-muted">{session.description}</p>
            ) : null}
          </section>

          <section className="rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
              <User className="h-5 w-5 text-primary" aria-hidden />
              Coach
            </h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailRow icon={<User className="h-4 w-4 text-primary" aria-hidden />} label="Name">
                {coachProfile?.full_name ?? "—"}
              </DetailRow>
              <DetailRow icon={<Mail className="h-4 w-4 text-primary" aria-hidden />} label="Email">
                {coachProfile?.email ?? "—"}
              </DetailRow>
              <DetailRow icon={<User className="h-4 w-4 text-primary" aria-hidden />} label="Specialization">
                {coach?.specialization ?? "—"}
              </DetailRow>
              <DetailRow icon={<Clock className="h-4 w-4 text-primary" aria-hidden />} label="Experience">
                {coach?.experience_years ? `${coach.experience_years} years` : "—"}
              </DetailRow>
            </dl>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <BookingActionsPanel
            bookingId={booking.id}
            status={booking.status}
            scheduledAt={booking.scheduled_at}
          />
        </div>
      </div>
    </Container>
  );
}
