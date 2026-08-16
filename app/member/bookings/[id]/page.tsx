import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  FileText,
  MapPin,
} from "lucide-react";
import { getBookingById, isBookingCancellable } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { CancelBookingButton } from "@/components/member/cancel-booking-button";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type Params = Promise<{ id: string }>;

const statusExplanations: Record<
  Database["public"]["Enums"]["booking_status"],
  string
> = {
  PENDING:
    "Your request has been sent to the coach and is awaiting confirmation.",
  CONFIRMED:
    "The coach confirmed your session. See you in the ring!",
  COMPLETED: "This session has been completed. Great work!",
  CANCELLED: "This booking was cancelled and the slot is now available again.",
  NO_SHOW: "This session was marked as a no-show.",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const booking = await getBookingById(id);
  return {
    title: booking.sessions?.title ?? "Booking details",
    description: `Booking details for ${booking.sessions?.title ?? "your session"} at Fight Zone.`,
  };
}

export default async function BookingDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const booking = await getBookingById(id);

  const cancellable = isBookingCancellable(booking.status, booking.scheduled_at);
  const coachName = booking.coach_profiles?.profiles?.full_name ?? "Coach";

  const detailRows = [
    {
      icon: CalendarClock,
      label: "Scheduled",
      value: formatDate(booking.scheduled_at, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    },
    {
      icon: Clock,
      label: "Duration",
      value: booking.sessions
        ? `${booking.sessions.duration_min} minutes`
        : "—",
    },
    {
      icon: MapPin,
      label: "Coach",
      value: `${coachName}${
        booking.coach_profiles?.specialization
          ? ` · ${booking.coach_profiles.specialization}`
          : ""
      }`,
    },
    {
      icon: FileText,
      label: "Requested on",
      value: formatDate(booking.created_at, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    },
  ];

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/member/bookings">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All bookings
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
                {booking.sessions?.title ?? "Session"}
              </h1>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted">{statusExplanations[booking.status]}</p>
            {booking.sessions?.description ? (
              <p className="max-w-prose text-sm leading-relaxed text-muted">
                {booking.sessions.description}
              </p>
            ) : null}
          </div>

          {booking.sessions ? (
            <Button variant="outline" size="sm" className="w-fit" asChild>
              <Link href={`/member/sessions/${booking.sessions.id}`}>
                View session details
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">
                Details
              </h2>
              <dl className="flex flex-col gap-4">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <row.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
                        {row.label}
                      </dt>
                      <dd className="flex items-center gap-1 text-sm text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>

              {booking.sessions ? (
                <div className="flex items-center justify-between rounded-md border border-ink-border bg-ink-soft/60 px-4 py-3">
                  <span className="text-sm text-muted">Price</span>
                  <span className="font-display text-xl font-bold text-primary">
                    {formatPrice(Number(booking.sessions.price))}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {booking.notes ? (
            <Card>
              <CardContent className="flex flex-col gap-2 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
                  <FileText className="h-4 w-4 text-primary" aria-hidden />
                  Your notes
                </h2>
                <p className="text-sm leading-relaxed text-muted">{booking.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-5">
            <CancelBookingButton bookingId={booking.id} cancellable={cancellable} />
          </div>
        </div>
      </div>
    </Container>
  );
}
