import "server-only";

import { Resend } from "resend";

/**
 * Thin transport layer for Update V3 email sends. It reuses the existing
 * Resend client (see `lib/email/resend.ts` for the app's other senders)
 * but keeps the V3 path isolated and focused: a single idempotent helper
 * that returns the provider message id. All persistence/dedup is handled
 * upstream by `lib/email/delivery.ts`.
 */

let client: Resend | null = null;

function getClient(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.startsWith("re_")) {
    throw new Error(
      "RESEND_API_KEY is not configured. It must be a valid Resend key (re_...).",
    );
  }
  client = new Resend(apiKey);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  messageId: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from =
    process.env.RESEND_FROM_EMAIL || "Fight Zone <noreply@fight-zone.app>";
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL;

  const { data, error } = await getClient().emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });

  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend returned no message id.");
  }
  return { messageId: data.id };
}
