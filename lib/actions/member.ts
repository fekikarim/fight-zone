"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  bookingSchema,
  cancelBookingSchema,
  memberProfileSchema,
} from "@/lib/validations/member";
import { logError } from "@/lib/errors";

export interface MemberActionState {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/**
 * Updates the member's personal info and their member_profiles extension.
 * `member_profiles` is created on first save (upsert), since signup only
 * creates `profiles` + the MEMBER role. Ownership is always derived from the
 * session — never from form input.
 */
export async function updateMemberProfile(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = memberProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    address: formData.get("address"),
    skillLevel: formData.get("skillLevel"),
    weight: formData.get("weight"),
    height: formData.get("height"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const data = parsed.data;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: data.fullName, phone: data.phone ?? null })
    .eq("id", user.id);
  if (profileError) {
    logError("Failed to update profile", profileError);
    return {
      ok: false,
      message: "We could not save your profile. Please try again.",
    };
  }

  const { error: memberError } = await supabase.from("member_profiles").upsert(
    {
      id: user.id,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      address: data.address ?? null,
      skill_level: data.skillLevel ?? undefined,
      weight: data.weight ?? null,
      height: data.height ?? null,
      bio: data.bio ?? null,
    },
    { onConflict: "id" },
  );
  if (memberError) {
    logError("Failed to update member profile", memberError);
    return {
      ok: false,
      message: "We could not save your profile. Please try again.",
    };
  }

  revalidatePath("/member", "layout");
  return { ok: true, message: "Profile updated successfully." };
}

/**
 * Creates a booking request. The status is always server-assigned as PENDING
 * and the member is always derived from the session — the client can never
 * influence ownership or state. A database partial-unique index rejects
 * duplicate active requests for the same session + time.
 */
export async function createBooking(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = bookingSchema.safeParse({
    sessionId: formData.get("sessionId"),
    scheduledAt: formData.get("scheduledAt"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, coach_id, is_active")
    .eq("id", parsed.data.sessionId)
    .eq("is_active", true)
    .maybeSingle();
  if (!session) {
    return { ok: false, message: "This session is no longer available." };
  }

  // bookings.member_id FK references member_profiles(id), which is not
  // auto-created at signup. Ensure the member row exists before booking.
  const { error: memberError } = await supabase
    .from("member_profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  if (memberError) {
    logError("Failed to ensure member profile before booking", memberError);
    return {
      ok: false,
      message: "We could not process your booking. Please try again.",
    };
  }

  const { error: bookingError } = await supabase.from("bookings").insert({
    member_id: user.id,
    session_id: parsed.data.sessionId,
    coach_id: session.coach_id,
    scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
    status: "PENDING",
    notes: parsed.data.notes ?? null,
  });

  if (bookingError) {
    logError("Failed to create booking", bookingError);
    if (bookingError.code === "23505") {
      return {
        ok: false,
        message: "You already have a booking for this session at that time.",
      };
    }
    return {
      ok: false,
      message: "We could not create your booking. Please try again.",
    };
  }

  revalidatePath("/member", "layout");
  redirect("/member/bookings");
}

/**
 * Cancels one of the member's own bookings. Only active (PENDING/CONFIRMED)
 * bookings scheduled in the future can be cancelled; terminal states and past
 * sessions are never touched. Ownership and state are enforced server-side.
 */
export async function cancelBooking(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = cancelBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at")
    .eq("id", parsed.data.bookingId)
    .eq("member_id", user.id)
    .maybeSingle();
  if (!booking) {
    return { ok: false, message: "This booking could not be found." };
  }

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { ok: false, message: "This booking can no longer be cancelled." };
  }
  if (new Date(booking.scheduled_at).getTime() <= Date.now()) {
    return {
      ok: false,
      message: "This session has already started and cannot be cancelled.",
    };
  }

  // Atomic transition: only cancels if the booking is still in the state we
  // read — a concurrent change (e.g. the coach completed it) is not overwritten.
  // The count from a PATCH with the `exact` option is the affected row count.
  const { error, count } = await supabase
    .from("bookings")
    .update({ status: "CANCELLED" }, { count: "exact" })
    .eq("id", parsed.data.bookingId)
    .eq("member_id", user.id)
    .eq("status", booking.status);
  if (error) {
    logError("Failed to cancel booking", error);
    return {
      ok: false,
      message: "We could not cancel your booking. Please try again.",
    };
  }
  if ((count ?? 0) === 0) {
    return {
      ok: false,
      message: "This booking was updated by the coach. Please refresh and try again.",
    };
  }

  revalidatePath("/member", "layout");
  return { ok: true, message: "Booking cancelled. The slot is now available again." };
}
