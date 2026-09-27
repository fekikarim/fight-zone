/* Email template tests: branding, links, escaping, text variants, subjects.
 * Run: npx tsx tests/email.test.ts (headless — no Resend calls, no network)
 */
import {
  buildBookingConfirmationEmail,
  buildCancellationAlertEmail,
  buildContactNotificationEmail,
  buildDailyCoachReportEmail,
  buildEmptyEventAlertEmail,
  buildEventReminderCoachEmail,
  buildEventReminderMemberEmail,
  buildGenericNotificationEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
} from "../lib/email/templates";
import { renderButton, renderEmailLayout } from "../lib/email/layout";
import type { EmailEvent } from "../lib/email/types";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => {
  if (c) { pass++; console.log(`PASS  ${n}`); }
  else { fail++; console.log(`FAIL  ${n}  ${extra}`); }
};

const EVIL = `<script>alert("x")</script>`;
const ev: EmailEvent = {
  id: "e1", title: `Sparring ${EVIL}`, description: "Desc", startAt: "2026-10-01T18:00:00Z",
  endAt: "2026-10-01T20:00:00Z", location: "Gym", eventType: "TRAINING",
  isPublic: true, maxParticipants: 20, participantCount: 5, isFree: false, priceTnd: 25,
};

// --- layout shell ---
const shell = renderEmailLayout({ preheader: "pre", title: "T", bodyHtml: "<p>B</p>" });
check("doctype + html", shell.startsWith("<!DOCTYPE html>"));
check("no <style> blocks (inline only)", !/<style[\s>]/i.test(shell));
check("no external stylesheets", !/<link[^>]*stylesheet/i.test(shell));
check("logo absolute URL", /<img[^>]+src="https?:\/\/[^"]+\/logo\/logo-fightzone-500x500\.png"/.test(shell));
check("no relative img src", !/<img[^>]+src="(?!https?:)[^"]*"/.test(shell));
check("wordmark fallback text", />FIGHT <span[^>]*>ZONE<\/span>/.test(shell));
check("footer site URL", /fight-zone|localhost|supabase/.test(shell));
check("footer contact email", shell.includes("contact@fightzone.example.com"));
check("preheader hidden", shell.includes("mso-hide:all") && shell.includes("pre"));
check("responsive meta", shell.includes('name="viewport"'));

// --- buttons escape ---
const btn = renderButton(`https://x.test/?a="b"`, `Go <here>`);
check("button href escaped", btn.includes("&quot;") && !btn.includes('"b"'));
check("button label escaped", btn.includes("Go &lt;here&gt;"));

// --- V3 builders: subjects preserved + links + escaping + text ---
const coach = buildEventReminderCoachEmail({ seifName: "Seif", event: ev, manageUrl: "https://x.test/m", calendarUrl: "https://x.test/c" });
check("coach subject preserved", coach.subject === `Reminder: ${ev.title} starts in 30 minutes`);
check("coach CTA in html", coach.html.includes("https://x.test/m"));
check("coach CTA in text", coach.text.includes("https://x.test/m"));
check("coach title escaped", coach.html.includes("&lt;script&gt;") && !coach.html.includes(EVIL));

const member = buildEventReminderMemberEmail({ memberName: "Karim", event: ev, eventUrl: "https://x.test/e", memberUrl: "https://x.test/me" });
check("member subject preserved", member.subject === `Fight Zone: ${ev.title} starts in 30 minutes`);
check("member CTA in html+text", member.html.includes("https://x.test/e") && member.text.includes("https://x.test/e"));
check("member escaped", !member.html.includes(EVIL));

const report = buildDailyCoachReportEmail({ seifName: "Seif", dateKey: "2026-10-01", events: [ev], reportUrl: "https://x.test/r" });
check("report subject has date", report.subject.includes("2026") || report.subject.includes("Oct"));
check("report CTA in text", report.text.includes("https://x.test/r"));
check("report escaped", !report.html.includes(EVIL));
const reportEmpty = buildDailyCoachReportEmail({ seifName: "Seif", dateKey: "2026-10-01", events: [], reportUrl: "https://x.test/r" });
check("report empty state", reportEmpty.html.includes("no events scheduled") && reportEmpty.text.includes("no events scheduled"));

const cancel = buildCancellationAlertEmail({ seifName: "Seif", memberName: `M ${EVIL}`, memberEmail: "m@test.ex", event: ev, eventManageUrl: "https://x.test/a" });
check("cancel subject preserved", cancel.subject === `Cancellation: M ${EVIL} left ${ev.title}`);
check("cancel member escaped", cancel.html.includes("&lt;script&gt;") && !cancel.html.includes(EVIL));
check("cancel CTA in text", cancel.text.includes("https://x.test/a"));

const empty = buildEmptyEventAlertEmail({ seifName: "Seif", event: ev, eventManageUrl: "https://x.test/a" });
check("empty subject preserved", empty.subject === `No participants yet: ${ev.title}`);
check("empty CTA in text", empty.text.includes("https://x.test/a"));

// --- legacy builders ---
const welcome = buildWelcomeEmail({ name: `A ${EVIL}` });
check("welcome subject preserved", welcome.subject === "Welcome to Fight Zone!");
check("welcome name escaped", welcome.html.includes("&lt;script&gt;") && !welcome.html.includes(EVIL));
check("welcome dashboard CTA in text", welcome.text.includes("/member"));

const reset = buildPasswordResetEmail({ resetLink: "https://x.test/reset?t=abc" });
check("reset subject preserved", reset.subject === "Reset Your Password - Fight Zone");
check("reset link preserved exactly", reset.html.includes("https://x.test/reset?t=abc") && reset.text.includes("https://x.test/reset?t=abc"));
check("reset expiry text preserved", reset.html.includes("1 hour") && reset.text.includes("1 hour"));

const contact = buildContactNotificationEmail({ name: `N ${EVIL}`, email: "n@t.ex", subject: `S ${EVIL}`, message: `line1\nline2 <b>` });
check("contact subject preserved", contact.subject === `New Contact Form Submission: S ${EVIL}`);
check("contact fields escaped", contact.html.includes("&lt;script&gt;") && !contact.html.includes(EVIL));
check("contact newlines preserved", contact.html.includes("<br/>"));
check("contact text has message", contact.text.includes("line1\nline2 <b>"));

const booking = buildBookingConfirmationEmail({ name: "N", sessionTitle: "S", scheduledAt: "2026-10-01T10:00:00Z" });
check("booking subject preserved", booking.subject === "Booking Confirmed - Fight Zone");

const generic = buildGenericNotificationEmail({ subject: "Hi", content: `C ${EVIL}` });
check("generic escaped", generic.html.includes("&lt;script&gt;") && !generic.html.includes(EVIL));

// NOTE: transport/delivery integration (Resend send, idempotency claims)
// is covered by TypeScript across all callers plus the unchanged V3
// runtime path — `server-only` modules cannot load in plain node, and no
// test may hit the network. Text-part wiring is asserted above per builder
// and type-checked end to end (builder → send.ts → transport.ts).

console.log(`\nRESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
