"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileUp,
  Hourglass,
  Loader2,
  MessageSquare,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, fieldA11y, fieldClass } from "@/components/ui/form-feedback";
import { createClient } from "@/lib/supabase/client";
import { cancelMyRegistration, registerForEvent, setMyPaymentPlan, submitPaymentProof } from "@/lib/actions/events";
import {
  formatTnd,
  getEventDisplayState,
  registrationStatusLabel,
  type EventDetail,
  type MemberRegistration,
} from "@/lib/types/events";
import { PROOF_MAX_BYTES, PROOF_MIME_TYPES } from "@/lib/validations/events";
import { formatDate } from "@/lib/utils";

interface Props {
  event: EventDetail;
  registration: MemberRegistration | null;
  userId: string;
  bankInstructions: string | null;
  inPersonInstructions: string | null;
  /** Server request time (keeps render pure). */
  now: number;
}

const ACTIVE = new Set(["PENDING", "CONFIRMED", "WAITLISTED"]);

/**
 * The member's single source of truth for one event: registration state,
 * payment state and the next action. All transitions are server RPCs; the
 * UI never assumes success (no optimistic seat/payment changes).
 */
export function MemberRegistrationPanel({ event, registration, userId, bankInstructions, inPersonInstructions, now }: Props) {
  const active = registration && ACTIVE.has(registration.registration_status);
  return (
    <div className="space-y-4">
      {active ? (
        <ActiveRegistration
          now={now}
          event={event}
          registration={registration}
          userId={userId}
          bankInstructions={bankInstructions}
          inPersonInstructions={inPersonInstructions}
        />
      ) : (
        <RegisterBlock event={event} previous={registration} now={now} />
      )}
      <Link
        href="/member/messages"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4" aria-hidden /> Questions? Message Coach Seif
      </Link>
    </div>
  );
}

function RegisterBlock({ event, previous, now }: { event: EventDetail; previous: MemberRegistration | null; now: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const state = getEventDisplayState(event, now);
  const full = event.spots_left === 0;

  const blocked: Record<string, string> = {
    cancelled: "This event was cancelled.",
    completed: "This event has ended.",
    in_progress: "This event has already started.",
    registration_closed: "Registration for this event is closed.",
    registration_not_open: event.registration_opens_at
      ? `Registration opens ${formatDate(event.registration_opens_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
      : "Registration has not opened yet.",
    full: "This event is full.",
    archived: "This event is no longer available.",
    draft: "This event is not published.",
  };

  if (state !== "open") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4 text-sm text-muted" role="status">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p>{blocked[state]}</p>
      </div>
    );
  }

  const paid = !event.is_free && (event.price_tnd ?? 0) > 0;
  const today = new Date(now).toISOString().slice(0, 10);
  const lastDay = event.start_at.slice(0, 10);

  const register = (formEl: HTMLFormElement) =>
    startTransition(async () => {
      const fd = new FormData(formEl);
      fd.set("eventId", event.id);
      if (paid && !fd.get("paymentMethod")) {
        toast.error("Choose how you will pay first.");
        return;
      }
      try {
        const res = await registerForEvent({ ok: false }, fd);
        if (!res.ok) {
          toast.error(res.message ?? "We could not register you.");
          return;
        }
        toast.success(
          res.registrationStatus === "WAITLISTED"
            ? "You're on the waitlist"
            : res.registrationStatus === "PENDING"
              ? "Request sent — Coach Seif will confirm"
              : "You're registered!",
          fd.get("paymentMethod") === "BANK_TRANSFER" ? { description: "Your transfer plan was sent to Coach Seif in Messages." } : undefined,
        );
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });

  const label = full && event.waitlist_enabled ? "Join the waitlist" : event.requires_approval ? "Request a place" : "Register";
  return (
    <div className="space-y-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-5">
      {previous?.registration_status === "REJECTED" ? (
        <p className="text-sm text-muted">
          Your previous request was declined{previous.decision_reason ? `: ${previous.decision_reason}` : "."} You can request again.
        </p>
      ) : null}
      <ul className="space-y-1 text-sm text-muted">
        <li>{event.is_free ? "Free event — no payment needed." : `Price: ${formatTnd(event.price_tnd)} — paid in person or by bank transfer.`}</li>
        {event.requires_approval ? <li>Coach Seif reviews each request before confirming.</li> : null}
        {full && event.waitlist_enabled ? <li>The event is full; you&apos;ll get a place automatically if one opens.</li> : null}
        {event.cancellation_deadline_hours > 0 ? (
          <li>You can cancel up to {event.cancellation_deadline_hours} h before the start.</li>
        ) : null}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); register(e.currentTarget); }} className="space-y-4">
        {paid ? <PaymentPlanFields today={today} lastDay={lastDay} /> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full gap-2 sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
        {pending ? "Checking your place…" : label}
      </Button>
      </form>
    </div>
  );
}

function ActiveRegistration({ event, registration, userId, bankInstructions, inPersonInstructions, now }: Props & { registration: MemberRegistration }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, startCancel] = useTransition();
  const status = registration.registration_status;
  const pay = registration.payment_status;
  const deadline = new Date(event.start_at).getTime() - event.cancellation_deadline_hours * 3600_000;
  const canCancel = pay !== "PAID" && now < deadline && event.status === "PUBLISHED";

  const Icon = status === "CONFIRMED" ? CalendarCheck : status === "PENDING" ? Hourglass : Clock;
  const explanation =
    status === "CONFIRMED"
      ? "Your place is confirmed."
      : status === "PENDING"
        ? "Your place is held while Coach Seif reviews your request."
        : "The event is full. You'll be moved in automatically, in order, if a place opens.";

  const cancel = () =>
    startCancel(async () => {
      const fd = new FormData();
      fd.set("registrationId", registration.id);
      try {
        const res = await cancelMyRegistration({ ok: false }, fd);
        if (!res.ok) {
          toast.error(res.message ?? "We could not cancel.");
          return;
        }
        toast.success("Registration cancelled");
        setConfirmOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4 sm:p-5" role="status">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold">{registrationStatusLabel[status]}</p>
          <p className="text-sm text-muted">{explanation}</p>
        </div>
      </div>

      {(status !== "WAITLISTED" && registration.amount_due_tnd > 0) || pay === "WAIVED" ? (
        <PaymentBlock
          eventStart={event.start_at}
          now={now}
          registration={registration}
          userId={userId}
          bankInstructions={bankInstructions}
          inPersonInstructions={inPersonInstructions}
        />
      ) : null}

      {canCancel ? (
        <>
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)} className="w-full gap-2 sm:w-auto">
            <UserMinus className="h-4 w-4" aria-hidden /> {status === "WAITLISTED" ? "Leave the waitlist" : "Cancel my registration"}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title="Cancel your registration?"
            description="Your place will be released to other members. You can register again later if places remain."
            confirmLabel="Yes, cancel"
            cancelLabel="Keep my place"
            pending={cancelling}
            onClose={() => !cancelling && setConfirmOpen(false)}
            onConfirm={cancel}
          />
        </>
      ) : pay === "PAID" ? (
        <p className="text-xs text-muted">Your payment is confirmed — to cancel, please message Coach Seif.</p>
      ) : null}
    </div>
  );
}

function PaymentBlock({
  registration,
  userId,
  bankInstructions,
  inPersonInstructions,
  eventStart,
  now,
}: {
  registration: MemberRegistration;
  userId: string;
  bankInstructions: string | null;
  inPersonInstructions: string | null;
  eventStart: string;
  now: number;
}) {
  const pay = registration.payment_status;
  const latest = registration.latest_submission;

  if (pay === "PAID") {
    return (
      <Notice icon={CheckCircle2} tone="success" title="Payment confirmed">
        Coach Seif confirmed your payment of {formatTnd(registration.amount_due_tnd)}.
      </Notice>
    );
  }
  if (pay === "WAIVED") {
    return (
      <Notice icon={CheckCircle2} tone="success" title="Covered by your reward">
        Nothing to pay for this event.
      </Notice>
    );
  }
  if (pay === "PROOF_SUBMITTED") {
    return (
      <Notice icon={Hourglass} tone="info" title="Proof received — awaiting review">
        You sent a transfer proof of {formatTnd(latest?.amount_declared)}. This is not yet a payment confirmation; Coach
        Seif will check it and you&apos;ll be notified.
      </Notice>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-5" aria-labelledby="pay-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pay-title" className="font-semibold">Payment</h2>
        <p className="font-display text-xl font-bold">{formatTnd(registration.amount_due_tnd)}</p>
      </div>
      <PaymentPlanSummary registration={registration} eventStart={eventStart} now={now} />
      {pay === "REJECTED" && latest?.rejection_reason ? (
        <Notice icon={AlertCircle} tone="error" title="Your last proof was not accepted">
          {latest.rejection_reason}. You can upload a new proof below or pay in person.
        </Notice>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-ink-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Banknote className="h-4 w-4 text-primary" aria-hidden /> In person</p>
          <p className="whitespace-pre-line text-sm text-muted">
            {inPersonInstructions || "Pay Coach Seif directly at the gym before the event. He'll record it and you'll be notified."}
          </p>
        </div>
        <div className="space-y-2 rounded-lg border border-ink-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><FileUp className="h-4 w-4 text-primary" aria-hidden /> Bank transfer</p>
          <p className="whitespace-pre-line text-sm text-muted">
            {bankInstructions || "Bank details haven't been published yet — message Coach Seif to get them."}
          </p>
        </div>
      </div>
      {bankInstructions ? <ProofUploadForm registration={registration} userId={userId} /> : null}
    </section>
  );
}

function ProofUploadForm({ registration, userId }: { registration: MemberRegistration; userId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy !== "idle") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fileRef.current?.files?.[0];
    const next: Record<string, string> = {};
    if (!file) next.proof = "Choose the receipt image or PDF.";
    else if (!(PROOF_MIME_TYPES as readonly string[]).includes(file.type)) next.proof = "Use a PNG, JPEG, WebP image or a PDF.";
    else if (file.size > PROOF_MAX_BYTES) next.proof = "The file must be 5 MB or smaller.";
    const amount = Number(fd.get("amount"));
    if (!fd.get("amount") || !Number.isFinite(amount) || amount <= 0) next.amount = "Enter the amount you transferred.";
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setBusy("uploading");
      const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" }[file!.type] ?? "bin";
      const path = `${userId}/payments/${registration.id}-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("fightzone-private").upload(path, file!, { contentType: file!.type, upsert: false });
      if (error) throw error;

      setBusy("saving");
      fd.set("registrationId", registration.id);
      fd.set("proofPath", path);
      fd.delete("proof");
      const res = await submitPaymentProof({ ok: false }, fd);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message ?? "We could not submit your proof.");
        return;
      }
      toast.success("Proof sent — Coach Seif will review it");
      form.reset();
      router.refresh();
    } catch {
      toast.error(navigator.onLine === false ? "You appear to be offline." : "Upload failed. Please try again.");
    } finally {
      setBusy("idle");
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 border-t border-ink-border pt-4" aria-busy={busy !== "idle"}>
      <p className="text-sm font-medium">Already transferred? Upload your receipt</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="proof" className="text-sm">Receipt (image or PDF, max 5 MB)</label>
          <input
            ref={fileRef}
            id="proof"
            name="proof"
            type="file"
            accept={PROOF_MIME_TYPES.join(",")}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-ink-softer file:px-3 file:py-2 file:text-sm file:text-foreground"
            {...fieldA11y("proof", errors.proof)}
          />
          <FieldError id="proof-error" message={errors.proof} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="amount" className="text-sm">Amount transferred (TND)</label>
          <input id="amount" name="amount" type="number" inputMode="decimal" step="0.001" min="0"
            defaultValue={registration.amount_due_tnd} className={fieldClass(!!errors.amount)} {...fieldA11y("amount", errors.amount)} />
          <FieldError id="amount-error" message={errors.amount} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reference" className="text-sm">Transfer reference <span className="text-muted">(optional)</span></label>
          <input id="reference" name="reference" maxLength={120} placeholder="e.g. TRF-2026-0042" className={fieldClass(!!errors.reference)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="note" className="text-sm">Note for Coach Seif <span className="text-muted">(optional)</span></label>
          <textarea id="note" name="note" rows={2} maxLength={1000} placeholder="Anything he should know about this transfer"
            className={fieldClass(!!errors.note, "resize-y")} />
        </div>
      </div>
      <p className="text-xs text-muted">Your receipt is stored privately — only you and Coach Seif can see it.</p>
      <Button type="submit" disabled={busy !== "idle"} className="w-full gap-2 sm:w-auto">
        {busy !== "idle" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}
        {busy === "uploading" ? "Uploading…" : busy === "saving" ? "Sending…" : "Send proof for review"}
      </Button>
    </form>
  );
}

function Notice({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof CheckCircle2;
  tone: "success" | "info" | "error";
  title: string;
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : tone === "error"
        ? "border-red-500/40 bg-red-500/10"
        : "border-sky-500/30 bg-sky-500/10";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${cls}`} role="status">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}

/** "How will you pay?" — required before registering for a paid event. */
function PaymentPlanFields({ today, lastDay, initial }: { today: string; lastDay: string; initial?: { method: string | null; date: string | null } }) {
  const [method, setMethod] = useState<string>(initial?.method ?? "");
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">How will you pay?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {([
          { v: "CASH", t: "In person", d: "Pay Coach Seif at the gym before the event." },
          { v: "BANK_TRANSFER", t: "Bank transfer", d: "Transfer, then upload the receipt here." },
        ] as const).map((o) => (
          <label key={o.v} className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input type="radio" name="paymentMethod" value={o.v} checked={method === o.v} onChange={() => setMethod(o.v)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span><span className="block text-sm font-medium">{o.t}</span><span className="text-xs text-muted">{o.d}</span></span>
          </label>
        ))}
      </div>
      {method === "BANK_TRANSFER" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm">When will you transfer?</span>
            <input type="date" name="plannedDate" required min={today} max={lastDay} defaultValue={initial?.date ?? ""}
              className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft px-3 text-base sm:text-sm" />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Message to Coach Seif <span className="text-muted">(optional)</span></span>
            <input name="note" maxLength={500} placeholder="e.g. I'll transfer from my BIAT account"
              className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft px-3 text-base sm:text-sm" />
          </label>
          <p className="text-xs text-muted sm:col-span-2">Your plan is sent to Coach Seif in Messages so you can discuss the transfer with him.</p>
        </div>
      ) : null}
    </fieldset>
  );
}

/** Shows the member's payment plan and lets them change it. */
function PaymentPlanSummary({ registration, eventStart, now }: { registration: MemberRegistration; eventStart: string; now: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const label = registration.payment_method === "BANK_TRANSFER"
    ? `Bank transfer${registration.planned_payment_date ? ` planned for ${formatDate(registration.planned_payment_date, { weekday: "short", day: "numeric", month: "short" })}` : ""}`
    : registration.payment_method === "CASH" ? "In person at the gym" : "Not chosen yet";
  return (
    <div className="rounded-lg border border-ink-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span><span className="text-muted">Your plan:</span> <strong>{label}</strong></span>
        <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs text-primary hover:underline">{editing ? "Close" : "Change"}</button>
      </div>
      {editing ? (
        <form className="mt-3 space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("registrationId", registration.id);
          start(async () => {
            const res = await setMyPaymentPlan({ ok: false }, fd);
            if (!res.ok) return void toast.error(res.message ?? "Could not save.");
            toast.success(res.message ?? "Saved");
            setEditing(false);
            router.refresh();
          });
        }}>
          <PaymentPlanFields today={new Date(now).toISOString().slice(0, 10)} lastDay={eventStart.slice(0, 10)}
            initial={{ method: registration.payment_method, date: registration.planned_payment_date }} />
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save plan"}</Button>
        </form>
      ) : null}
    </div>
  );
}
