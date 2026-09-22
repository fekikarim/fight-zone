import "server-only";

import { sendEmail } from "@/lib/email/transport";
import {
  claimDelivery,
  markDelivered,
  markFailed,
} from "@/lib/email/delivery";
import type { DeliveryType, EmailPayload } from "@/lib/email/types";
import { logError, logDegradation } from "@/lib/errors";

export interface SendOutcome {
  /** true when this run was the claimant and performed the send. */
  claimed: boolean;
  /** true when the send completed and was recorded as SENT. */
  sent: boolean;
  messageId: string | null;
}

/**
 * Durable, idempotent delivery of a single rendered email.
 *
 * Flow (all invariants enforced atomically in the DB):
 *   1. CLAIM — this process tries to own the (type, key, recipient)
 *      delivery. If another run owns it, or it was already sent
 *      (terminal), we no-op (`claimed=false`).
 *   2. SEND  — render + transmit via Resend.
 *   3. MARK  — on success record SENT (+ message id); on failure record
 *      FAILED so the scheduler can retry (only PENDING -> FAILED).
 *
 * Exceptions are surfaced to callers (jobs catch and log); the delivery
 * row is left FAILED for retry.
 */
export async function deliverEmail(input: {
  type: DeliveryType;
  key: string;
  recipient: string;
  subject: string;
  render: () => EmailPayload;
}): Promise<SendOutcome> {
  const claim = await claimDelivery(input.type, input.key, input.recipient, input.subject);
  if (!claim) {
    return { claimed: false, sent: false, messageId: null };
  }

  try {
    // Render lazily after we hold the claim, so we never build HTML we
    // aren't allowed to send.
    const payload = input.render();
    const result = await sendEmail({
      to: input.recipient,
      subject: payload.subject,
      html: payload.html,
    });
    await markDelivered(claim.id, result.messageId);
    return { claimed: true, sent: true, messageId: result.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await markFailed(claim.id, message);
    } catch (markErr) {
      logDegradation("deliverEmail: failed to record FAILED state", markErr, {
        type: input.type,
        key: input.key,
        recipient: input.recipient,
      });
    }
    logError("deliverEmail: transmission failed", err, {
      type: input.type,
      key: input.key,
      recipient: input.recipient,
    });
    throw err;
  }
}
