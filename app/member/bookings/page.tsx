import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { getCurrentUserBookings, isBookingCancellable } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { CancelBookingButton } from "@/components/member/cancel-booking-button";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "Your Fight Zone session bookings.",
};

export default async function MemberBookingsPage() {
  const bookings = await getCurrentUserBookings();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          My bookings
        </h1>
        <p className="text-sm text-muted">
          Track the status of every session you&apos;ve requested.
        </p>
      </div>

      {bookings.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {bookings.map((booking) => {
            const cancellable = isBookingCancellable(
              booking.status,
              booking.scheduled_at,
            );
            const coachName =
              booking.coach_profiles?.profiles?.full_name ?? null;

            return (
              <li
                key={booking.id}
                className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-soft/50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
                        {booking.sessions?.title ?? "Session"}
                      </h2>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-muted">
                      {formatDate(booking.scheduled_at, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                      {booking.sessions ? (
                        <span>{booking.sessions.duration_min} minutes</span>
                      ) : null}
                      {coachName ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                          with {coachName}
                        </span>
                      ) : null}
                      {booking.sessions ? (
                        <span className="font-semibold text-primary">
                          {formatPrice(Number(booking.sessions.price))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/member/bookings/${booking.id}`}>
                      View details
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>

                {booking.notes ? (
                  <p className="rounded-md border border-ink-border bg-ink/60 px-3.5 py-2.5 text-sm text-muted">
                    {booking.notes}
                  </p>
                ) : null}

                <div className="border-t border-ink-border pt-4">
                  <CancelBookingButton bookingId={booking.id} cancellable={cancellable} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40 p-8 sm:p-14 mt-4">
          <div className="absolute right-0 top-0 h-full w-full opacity-15 sm:w-1/2">
            <Image src="/components/sports-physiotherapy-illustration-2000x2000.jpg" alt="Recovery and Training" fill className="object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-soft via-ink-soft/90 to-transparent sm:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-soft/60 via-ink-soft/20 to-transparent sm:block" />
          </div>
          <div className="relative z-10 flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              Your next round starts here
            </h2>
            <p className="text-base text-zinc-300">
              You haven't requested any bookings yet. Explore Fight Zone training and find the session that fits your goals.
            </p>
            <div className="mt-2 flex">
              <Button asChild size="lg">
                <Link href="/member/sessions">Explore Training</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
