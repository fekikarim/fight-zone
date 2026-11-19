/**
 * Coach-friendly placeholders for automatic messages. Seif edits text with
 * readable chips like [Member's first name]; storage keeps the {{key}} form
 * the database renderer understands. Conversion is lossless both ways.
 */
export const TEMPLATE_VARS = {
  first_name: { label: "Member's first name", example: "Amine" },
  event_title: { label: "Event name", example: "Saturday sparring" },
  event_date: { label: "Event date & time", example: "Sat 28 Nov 2026, 18:00" },
  amount: { label: "Amount to pay", example: "30.000 TND" },
  reason: { label: "Your reason", example: " Reason: the session was moved." },
  badge_name: { label: "Badge name", example: "Ten Rounds" },
  reward: { label: "Reward details", example: " Reward unlocked: 10.000 TND off one event." },
} as const;

export type TemplateVar = keyof typeof TEMPLATE_VARS;

/** Which placeholders make sense in each automatic message. */
export const TEMPLATE_VARS_BY_KEY: Record<string, TemplateVar[]> = {
  welcome: ["first_name"],
  registration_pending: ["first_name", "event_title", "event_date"],
  registration_confirmed: ["first_name", "event_title", "event_date"],
  registration_waitlisted: ["first_name", "event_title", "event_date"],
  registration_rejected: ["first_name", "event_title", "event_date", "reason"],
  registration_cancelled: ["first_name", "event_title", "event_date", "reason"],
  payment_instructions: ["first_name", "event_title", "amount"],
  payment_proof_received: ["first_name", "event_title"],
  payment_confirmed: ["first_name", "event_title", "amount"],
  payment_rejected: ["first_name", "event_title", "reason"],
  event_cancelled: ["first_name", "event_title", "event_date", "reason"],
  event_updated: ["first_name", "event_title", "event_date"],
  badge_earned: ["first_name", "badge_name", "reward"],
  reward_available: ["first_name", "reward"],
  reward_redeemed: ["first_name", "reward", "event_title"],
};

const LABEL_TO_KEY = new Map(Object.entries(TEMPLATE_VARS).map(([k, v]) => [v.label.toLowerCase(), k]));

/** {{first_name}} → [Member's first name] */
export function toFriendly(body: string): string {
  return body.replace(/\{\{([a-z_]+)\}\}/g, (m, k: string) => (k in TEMPLATE_VARS ? `[${TEMPLATE_VARS[k as TemplateVar].label}]` : m));
}

/** [Member's first name] → {{first_name}} (unknown [text] stays as written). */
export function fromFriendly(body: string): string {
  return body.replace(/\[([^\]\n]{2,40})\]/g, (m, label: string) => {
    const k = LABEL_TO_KEY.get(label.trim().toLowerCase());
    return k ? `{{${k}}}` : m;
  });
}

/** Preview with example values. */
export function previewTemplate(friendly: string): string {
  return fromFriendly(friendly).replace(/\{\{([a-z_]+)\}\}/g, (_m, k: string) =>
    k in TEMPLATE_VARS ? TEMPLATE_VARS[k as TemplateVar].example : "");
}

/** Plain-language description of when each message is sent. */
export const TEMPLATE_HELP: Record<string, string> = {
  welcome: "Sent once, right after a new member creates an account.",
  registration_pending: "Sent when a member requests a place on an event that needs your approval.",
  registration_confirmed: "Sent when a member's place is confirmed (instantly or after your approval).",
  registration_waitlisted: "Sent when the event is full and the member joins the waitlist.",
  registration_rejected: "Sent when you decline a registration request.",
  registration_cancelled: "Sent when you cancel a member's registration.",
  payment_instructions: "Sent after registering for a paid event, explaining how to pay.",
  payment_proof_received: "Sent when a member uploads a bank-transfer receipt.",
  payment_confirmed: "Sent when you confirm a payment (bank transfer or in person).",
  payment_rejected: "Sent when you reject a payment receipt.",
  event_cancelled: "Sent to everyone registered when you cancel an event.",
  event_updated: "Sent to everyone registered when an event's date or place changes.",
  badge_earned: "Sent when a member earns a badge from attended events.",
  reward_available: "Sent when a reward becomes usable.",
  reward_redeemed: "Sent when you apply a member's reward to an event.",
};
