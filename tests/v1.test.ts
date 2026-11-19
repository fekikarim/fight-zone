/**
 * V1 unit tests (pure logic): money, event display state, CMS block
 * validation & safe rendering inputs, redirect safety, CSV safety.
 * Run: npx tsx tests/v1.test.ts
 */
import { formatTnd, getEventDisplayState, priceLabel } from "../lib/types/events";
import { blockSchema, parsePageContentSafe, toEmbedUrl } from "../lib/cms/blocks";
import { safeNextPath } from "../lib/auth/redirect";
import { badgeSchema } from "../lib/validations/badges";
import { decideRegistrationSchema, reviewPaymentSchema, submitPaymentProofSchema } from "../lib/validations/events";

let pass = 0;
let fail = 0;
function t(name: string, ok: boolean) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
}

// Money
t("formatTnd uses millimes", formatTnd(45) === "45.000 TND" && formatTnd(12.5) === "12.500 TND");
t("formatTnd null-safe", formatTnd(null) === "0.000 TND");
t("priceLabel free/paid", priceLabel({ is_free: true, price_tnd: null }) === "Free" && priceLabel({ is_free: false, price_tnd: 30 }) === "30 TND");
t("priceLabel keeps millimes", priceLabel({ is_free: false, price_tnd: 12.5 }) === "12.500 TND");

// Event display state
const now = Date.parse("2026-11-18T12:00:00Z");
const ev = (o: Partial<Parameters<typeof getEventDisplayState>[0]>) => ({
  status: "PUBLISHED" as const, start_at: "2026-11-20T10:00:00Z", end_at: null, spots_left: 5,
  registration_opens_at: null, registration_closes_at: null, waitlist_enabled: false, ...o,
});
t("draft", getEventDisplayState(ev({ status: "DRAFT" }), now) === "draft");
t("cancelled", getEventDisplayState(ev({ status: "CANCELLED" }), now) === "cancelled");
t("open", getEventDisplayState(ev({}), now) === "open");
t("full without waitlist", getEventDisplayState(ev({ spots_left: 0 }), now) === "full");
t("full with waitlist stays open", getEventDisplayState(ev({ spots_left: 0, waitlist_enabled: true }), now) === "open");
t("registration not open yet", getEventDisplayState(ev({ registration_opens_at: "2026-11-19T00:00:00Z" }), now) === "registration_not_open");
t("registration closed", getEventDisplayState(ev({ registration_closes_at: "2026-11-18T00:00:00Z" }), now) === "registration_closed");
t("in progress", getEventDisplayState(ev({ start_at: "2026-11-18T11:00:00Z" }), now) === "in_progress");
t("completed", getEventDisplayState(ev({ start_at: "2026-11-17T10:00:00Z", end_at: "2026-11-17T12:00:00Z" }), now) === "completed");

// CMS
t("valid richText block", blockSchema.safeParse({ id: "a", type: "richText", text: "Hello" }).success);
t("unknown block type rejected", !blockSchema.safeParse({ id: "a", type: "script", text: "x" }).success);
t("stats require verification", !blockSchema.safeParse({ id: "s", type: "stats", items: [{ value: "10", label: "Years" }], verified: false }).success);
t("quote requires consent", !blockSchema.safeParse({ id: "q", type: "quote", text: "Great", consent: false }).success);
t("images must be https", !blockSchema.safeParse({ id: "i", type: "image", image: { url: "javascript:alert(1)", alt: "" } }).success);
t("cta href must be path or https", !blockSchema.safeParse({ id: "c", type: "cta", title: "T", label: "L", href: "javascript:alert(1)" }).success);
t("video allowlist", toEmbedUrl("https://www.youtube.com/watch?v=abcdef123") !== null && toEmbedUrl("https://evil.example/v.mp4") === null);
const safe = parsePageContentSafe({ blocks: [{ id: "a", type: "richText", text: "ok" }, { id: "b", type: "nope" }, null] });
t("renderer keeps valid blocks, drops bad ones", safe.blocks.length === 1 && safe.dropped === 2);
t("renderer survives garbage", parsePageContentSafe("not json").blocks.length === 0);

// Redirect safety
t("next: relative path allowed", safeNextPath("/member/events/1", "/member") === "/member/events/1");
t("next: protocol-relative blocked", safeNextPath("//evil.com", "/member") === "/member");
t("next: absolute URL blocked", safeNextPath("https://evil.com", "/member") === "/member");
t("next: backslash blocked", safeNextPath("/\\evil.com", "/member") === "/member");

// Validation
t("cancel needs a reason", !decideRegistrationSchema.safeParse({ registrationId: "00000000-0000-4000-8000-000000000000", decision: "CANCEL" }).success);
t("reject proof needs a reason", !reviewPaymentSchema.safeParse({ submissionId: "00000000-0000-4000-8000-000000000000", decision: "REJECT" }).success);
t("proof amount must be positive", !submitPaymentProofSchema.safeParse({ registrationId: "00000000-0000-4000-8000-000000000000", proofPath: "u/payments/x.png", amount: "0" }).success);
t("proof amount ≤ 3 decimals", !submitPaymentProofSchema.safeParse({ registrationId: "00000000-0000-4000-8000-000000000000", proofPath: "u/payments/x.png", amount: "1.0001" }).success);
const badgeBase = { name: "Ten", threshold: "10", tier: "BRONZE", icon: "medal", accent: "rose", is_active: true, reward_requires_approval: true, description: "", reward_terms: "" };
t("badge without reward ok", badgeSchema.safeParse({ ...badgeBase, reward_type: "NONE" }).success);
t("reward needs a value", !badgeSchema.safeParse({ ...badgeBase, reward_type: "DISCOUNT_TND" }).success);

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
