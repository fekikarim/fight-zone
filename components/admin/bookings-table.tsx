import Link from "next/link";
import { ArrowUpRight, CalendarClock, Clock } from "lucide-react";
import {
  canTransitionBooking,
  type AdminBookingListRow,
  type BookingAction,
} from "@/lib/supabase/queries";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { BookingActionButton } from "@/components/admin/booking-action-button";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";

const quickActions: BookingAction[] = ["confirm", "cancel"];

function scheduleText(scheduledAt: string): string {
  return formatDate(scheduledAt, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Responsive booking list: a full table on md+ screens and stacked cards on
 * mobile, so no content or action is squeezed out. Quick actions (confirm /
 * cancel) are rendered inline; complete / no-show live on the detail page.
 */
export function BookingsTable({ rows }: { rows: AdminBookingListRow[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-ink-border bg-ink-soft/40 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-border bg-ink-soft/60">
            <tr className="text-xs font-semibold uppercase tracking-widest text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Booking</th>
              <th scope="col" className="px-4 py-3 font-semibold">Member</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 font-semibold">Requested</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-border">
            {rows.map((row) => {
              const memberName = row.member_profiles?.profiles?.full_name ?? "Member";
              const actions = quickActions.filter((action) =>
                canTransitionBooking(row.status, action, row.scheduled_at),
              );
              return (
                <tr key={row.id} className="transition-colors hover:bg-ink-soft/40">
                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">
                      {row.sessions?.title ?? "Session"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      {scheduleText(row.scheduled_at)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-foreground">{memberName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {row.sessions
                        ? `${row.sessions.duration_min} min · ${formatPrice(Number(row.sessions.price))}`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <BookingStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4 text-muted">
                    {formatDate(row.created_at, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {actions.map((action) => (
                        <BookingActionButton key={action} bookingId={row.id} action={action} />
                      ))}
                      <Button asChild variant="ghost" size="icon" aria-label="View booking details">
                        <Link href={`/admin/bookings/${row.id}`}>
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-4 md:hidden">
        {rows.map((row) => {
          const memberName = row.member_profiles?.profiles?.full_name ?? "Member";
          const actions = quickActions.filter((action) =>
            canTransitionBooking(row.status, action, row.scheduled_at),
          );
          return (
            <li key={row.id} className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-soft/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-base font-semibold uppercase tracking-wide">
                      {row.sessions?.title ?? "Session"}
                    </h2>
                    <BookingStatusBadge status={row.status} />
                  </div>
                  <p className="text-sm text-muted">{memberName}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {scheduleText(row.scheduled_at)}
                  </p>
                  {row.sessions ? (
                    <p className="text-xs text-muted">
                      {row.sessions.duration_min} min · {formatPrice(Number(row.sessions.price))}
                    </p>
                  ) : null}
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/bookings/${row.id}`}>
                    Details
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>

              {actions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-ink-border pt-4">
                  {actions.map((action) => (
                    <BookingActionButton key={action} bookingId={row.id} action={action} />
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
