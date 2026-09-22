import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryType } from "@/lib/email/types";

/**
 * App-side wrapper around the atomic, DB-encapsulated delivery state
 * machine (`claim_email_delivery` / `mark_email_delivery_sent` /
 * `mark_email_delivery_failed`). All invariants (no double send, SENT
 * terminal, FAILED retryable, claimant uniqueness) live in the SECURITY
 * DEFINER functions; this module only marshals arguments and results.
 *
 * The admin client is required because no user session exists in the
 * contexts that drive these deliveries (cron + background server actions)
 * and because email is a trusted, server-only concern.
 */

export interface ClaimResult {
  id: string;
  status: "PENDING";
  attempts: number;
}

/**
 * Atomically claims a delivery for sending. Returns the owned row when
 * this process may send, or `null` when the delivery is already owned by
 * another run (in-flight) or has already been sent (terminal).
 *
 * @param deliveryType logical type of the message
 * @param deliveryKey  idempotency key scoped to (deliveryType, recipient)
 * @param recipient    target email address
 * @param subject      captured subject for the delivery log
 */
export async function claimDelivery(
  deliveryType: DeliveryType,
  deliveryKey: string,
  recipient: string,
  subject: string,
): Promise<ClaimResult | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_email_delivery", {
    p_type: deliveryType,
    p_key: deliveryKey,
    p_recipient: recipient,
    p_subject: subject,
  });

  if (error) {
    throw new Error(`claim_email_delivery failed: ${error.message}`);
  }
  if (!data) return null;
  return { id: data.id, status: "PENDING", attempts: data.attempts };
}

/** Marks a claimed delivery as sent. Only transitions PENDING -> SENT. */
export async function markDelivered(id: string, messageId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_email_delivery_sent", {
    p_id: id,
    p_message_id: messageId,
  });
  if (error) {
    throw new Error(`mark_email_delivery_sent failed: ${error.message}`);
  }
}

/** Marks a claimed delivery as failed (retryable). Only PENDING -> FAILED. */
export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_email_delivery_failed", {
    p_id: id,
    p_error_message: errorMessage.slice(0, 2000),
  });
  if (error) {
    throw new Error(`mark_email_delivery_failed failed: ${error.message}`);
  }
}
