"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { updateBookingStatusSchema } from "@/lib/validations/admin-bookings";
import { logError } from "@/lib/errors";
import type { Database } from "@/types/database.types";

export interface AdminBookingActionState {
  ok: boolean;
  message?: string;
}

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const actionToStatus: Record<z.infer<typeof updateBookingStatusSchema>["action"], BookingStatus> = {
  confirm: "CONFIRMED",
  cancel: "CANCELLED",
  complete: "COMPLETED",
  no_show: "NO_SHOW",
};

const successMessages: Record<keyof typeof actionToStatus, string> = {
  confirm: "Booking confirmed. The member has been notified.",
  cancel: "Booking cancelled.",
  complete: "Session marked as completed.",
  no_show: "Booking marked as a no-show.",
};

/**
 * Transitions a booking to its next lifecycle state as a coach/admin.
 *
 * Authorization (all layers):
 *   1. UI — only renders the actions the current role may take.
 *   2. Server action — admin may manage any booking; a coach only bookings
 *      assigned to them (`bookings.coach_id = auth.uid()`).
 *   3. Database — the `enforce_booking_transition` trigger is the final
 *      authority on the state machine, and the updated RLS narrows the row.
 *
 * Concurrency: the UPDATE is atomic — it only applies when the row is still
 * in the exact status this action was computed from (`WHERE status = ?`). If
 * another staff member changed it first, the affected-row count is 0 and we
 * report a stale-booking conflict instead of silently overwriting state.
 */
export async function updateBookingStatus(
  _prev: AdminBookingActionState,
  formData: FormData,
): Promise<AdminBookingActionState> {
  const parsed = updateBookingStatusSchema.safeParse({
    bookingId: formData.get("bookingId"),
    action: formData.get("action"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Please choose a valid booking and action." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const isAdmin = user.roles.includes("ADMIN");
  const isCoach = user.roles.includes("COACH");
  if (!isAdmin && !isCoach) {
    return { ok: false, message: "You do not have permission to manage bookings." };
  }

  const { bookingId, action } = parsed.data;
  const targetStatus = actionToStatus[action];
  const supabase = await createClient();

  // RLS scopes this read to the acting role (coach sees only their own rows).
  const { data: booking, error: loadError } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at, coach_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadError) {
    logError("Failed to load booking for transition", loadError, { bookingId, action });
    return { ok: false, message: "We could not load this booking. Please try again." };
  }
  if (!booking) {
    return { ok: false, message: "This booking could not be found." };
  }

  // Coach ownership: only admin may manage another coach's bookings.
  if (!isAdmin && booking.coach_id !== user.id) {
    return { ok: false, message: "You do not have permission to manage this booking." };
  }

  // Business rules (the DB trigger re-checks these authoritatively).
  const now = Date.now();
  const scheduled = new Date(booking.scheduled_at).getTime();

  if (action === "confirm" && booking.status !== "PENDING") {
    return { ok: false, message: "Only pending requests can be confirmed." };
  }
  if ((action === "complete" || action === "no_show") && booking.status !== "CONFIRMED") {
    return { ok: false, message: "Only confirmed bookings can be marked." };
  }
  if ((action === "complete" || action === "no_show") && scheduled > now) {
    return { ok: false, message: "This session has not started yet." };
  }
  if (action === "cancel" && booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { ok: false, message: "This booking can no longer be cancelled." };
  }

  // Atomic, concurrency-safe transition. The count from a PATCH with the
  // `exact` option is the number of rows actually updated.
  const { error: updateError, count } = await supabase
    .from("bookings")
    .update({ status: targetStatus }, { count: "exact" })
    .eq("id", bookingId)
    .eq("status", booking.status);

  if (updateError) {
    logError("Failed to update booking status", updateError, { bookingId, action });
    if (updateError.code === "42501") {
      return { ok: false, message: "That transition is not allowed for this booking." };
    }
    return { ok: false, message: "We could not update this booking. Please try again." };
  }
  if ((count ?? 0) === 0) {
    return {
      ok: false,
      message: "This booking was updated by someone else. Please refresh and try again.",
    };
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: successMessages[action] };
}
