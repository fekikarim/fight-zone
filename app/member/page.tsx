import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { getCurrentUserBookings } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Account",
  description: "Your Fight Zone member dashboard.",
};

export default async function MemberPage() {
  const user = await requireUser();

  let bookings: Awaited<ReturnType<typeof getCurrentUserBookings>> = [];
  try {
    bookings = await getCurrentUserBookings();
  } catch {
    // Quietly degrade on the placeholder dashboard.
  }

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Welcome, {user.fullName?.split(" ")[0] ?? "Member"}
          </h1>
          {user.roles.map((role) => (
            <Badge key={role} variant="neutral">
              {role}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted">
          Your dashboard is ready. Bookings and training history will appear here.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border border-ink-border bg-ink-soft/50 p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">
            My bookings
          </h2>
          {bookings.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink p-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{booking.sessions?.title ?? "Session"}</span>
                    <span className="text-xs text-muted">
                      {formatDate(booking.scheduled_at, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <Badge variant={booking.status === "CONFIRMED" ? "solid" : "neutral"}>
                    {booking.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No bookings yet.</p>
          )}
        </div>
      </div>
    </Container>
  );
}
