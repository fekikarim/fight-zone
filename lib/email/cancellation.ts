import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/config";
import { deliverEmail } from "@/lib/email/send";
import {
  buildCancellationAlertEmail,
  buildEmptyEventAlertEmail,
} from "@/lib/email/templates";
import type { CancellationAlertData, EmailEvent, EmptyEventAlertData } from "@/lib/email/types";
import { logError } from "@/lib/errors";

interface Fingerprint {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  event_type: string;
  is_public: boolean;
  max_participants: number | null;
  is_free: boolean;
  price_tnd: number | null;
  created_by: string;
  participant_count: number;
}

function toEmailEvent(f: Fingerprint): EmailEvent {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    startAt: f.start_at,
    endAt: f.end_at,
    location: f.location,
    eventType: f.event_type,
    isPublic: f.is_public,
    maxParticipants: f.max_participants,
    participantCount: f.participant_count,
    isFree: f.is_free,
    priceTnd: f.price_tnd,
  };
}

/**
 * Posts a member's event cancellation to the coach (Seif) via email, and —
 * when the authoritative post-cancel participant count drops to zero — also
 * sends the empty-event alert.
 *
 * This runs server-side AFTER the cancellation has been committed, is fully
 * out-of-band (never throws / never affects the cancellation result), and is
 * idempotent: every message is claimed against the email_deliveries log under
 * a (type, key, recipient) key, so retries and overlapping runs can never
 * produce duplicate notifications.
 *
 * The coach, the member's contact, and the updated participant count are all
 * resolved from trusted backend data (service role via SECURITY DEFINER RPCs),
 * never from client input.
 */
export async function notifyEventCancellation(input: {
  eventId: string;
  memberId: string;
}): Promise<void> {
  const { eventId, memberId } = input;
  const admin = createAdminClient();

  try {
    // Authoritative post-commit event state (participant_count excludes CANCELLED).
    const { data: rows, error: eventError } = await admin.rpc("get_event_fingerprint", {
      p_event_id: eventId,
    });
    if (eventError || !rows || rows.length === 0) {
      logError("notifyEventCancellation: event fingerprint unavailable", eventError ?? new Error("no row"), {
        eventId,
      });
      return;
    }
    const event = toEmailEvent(rows[0] as Fingerprint);

    // First staff recipient (COACH preferred) = Seif.
    const { data: staff, error: staffError } = await admin.rpc("get_staff_recipients");
    if (staffError || !staff || staff.length === 0) {
      logError("notifyEventCancellation: no staff recipient", staffError ?? new Error("no staff"), {
        eventId,
      });
      return;
    }
    const coach = staff[0] as { email: string; full_name: string | null };

    // Cancelled member's contact (for the alert copy).
    const { data: member, error: memberError } = await admin.rpc("get_profile_contact", {
      p_profile_id: memberId,
    });
    const memberContact =
      memberError || !member || member.length === 0
        ? null
        : (member[0] as { email: string | null; full_name: string | null });

    const manageUrl = `${getSiteUrl()}/admin/events/${eventId}`;

    const alertData: CancellationAlertData = {
      seifName: coach.full_name ?? "Coach",
      memberName: memberContact?.full_name ?? memberContact?.email ?? "A member",
      memberEmail: memberContact?.email ?? null,
      event,
      eventManageUrl: manageUrl,
    };
    await deliverEmail({
      type: "EVENT_CANCELLATION_ALERT",
      key: `cancel:${eventId}:${memberId}`,
      recipient: coach.email,
      subject: `Cancellation: ${alertData.memberName} left ${event.title}`,
      render: () => buildCancellationAlertEmail(alertData),
    });

    // Empty-event alert fires exactly on the transition to zero participants.
    // The `event.participant_count` above is the authoritative post-cancel count.
    if (event.participantCount === 0) {
      const emptyData: EmptyEventAlertData = {
        seifName: coach.full_name ?? "Coach",
        event,
        eventManageUrl: manageUrl,
      };
      await deliverEmail({
        type: "EVENT_EMPTY_ALERT",
        key: `empty:${eventId}`,
        recipient: coach.email,
        subject: `No participants yet: ${event.title}`,
        render: () => buildEmptyEventAlertEmail(emptyData),
      });
    }
  } catch (err) {
    // Never let an email failure surface to the member or roll anything back.
    logError("notifyEventCancellation: skipped", err, { eventId, memberId });
  }
}
