import { canTransitionBooking, type BookingAction } from "@/lib/supabase/queries";
import { BookingActionButton } from "@/components/admin/booking-action-button";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const allActions: BookingAction[] = ["confirm", "cancel", "complete", "no_show"];

interface BookingActionsPanelProps {
  bookingId: string;
  status: BookingStatus;
  scheduledAt: string;
}

/**
 * Renders every lifecycle action the current booking state allows. The
 * availability decision is a pure display hint (computed server-side); the
 * server action and DB trigger remain authoritative.
 */
export function BookingActionsPanel({ bookingId, status, scheduledAt }: BookingActionsPanelProps) {
  const actions = allActions.filter((action) =>
    canTransitionBooking(status, action, scheduledAt),
  );
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          Manage booking
        </h2>
        <p className="text-sm text-muted">
          The booking status will only change if it is still valid — the
          database enforces every transition.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {actions.map((action) => (
            <BookingActionButton key={action} bookingId={bookingId} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
