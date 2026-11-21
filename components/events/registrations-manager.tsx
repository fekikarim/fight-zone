"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, Check, FileSearch, Mail, Phone, UserX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, statusTone } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fieldClass } from "@/components/ui/form-feedback";
import { decideRegistration, recordAttendance, recordInPersonPayment, type EventActionState } from "@/lib/actions/events";
import {
  eventPaymentStatusLabel,
  formatTnd,
  type EventParticipant,
  type RegistrationStatus,
} from "@/lib/types/events";
import { cn, formatDate } from "@/lib/utils";

interface Props {
  participants: EventParticipant[];
  eventStarted: boolean;
  eventId: string;
}

const FILTERS: Array<{ key: "ALL" | RegistrationStatus; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "To review" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "WAITLISTED", label: "Waitlist" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "REJECTED", label: "Declined" },
];

type Dialog =
  | { kind: "cancel" | "decline"; p: EventParticipant }
  | { kind: "pay"; p: EventParticipant }
  | null;

/** Seif's per-event registration desk: decisions, payments, attendance. */
export function RegistrationsManager({ participants, eventStarted, eventId }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | RegistrationStatus>("ALL");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: participants.length };
    for (const p of participants) c[p.registration_status] = (c[p.registration_status] ?? 0) + 1;
    return c;
  }, [participants]);
  const rows = filter === "ALL" ? participants : participants.filter((p) => p.registration_status === filter);

  const run = (id: string, action: (prev: EventActionState, fd: FormData) => Promise<EventActionState>, fd: FormData, after?: () => void) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await action({ ok: false }, fd);
        if (res.ok) {
          toast.success(res.message ?? "Saved");
          after?.();
          router.refresh();
        } else {
          toast.error(res.message ?? "That didn't work.");
        }
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const decide = (p: EventParticipant, decision: "CONFIRM" | "REJECT" | "CANCEL", reason?: string) => {
    const fd = new FormData();
    fd.set("registrationId", p.id);
    fd.set("decision", decision);
    if (reason) fd.set("reason", reason);
    run(p.id, decideRegistration, fd, () => setDialog(null));
  };

  const attendance = (p: EventParticipant, status: "ATTENDED" | "NO_SHOW" | "UNMARKED") => {
    const fd = new FormData();
    fd.set("registrationId", p.id);
    fd.set("status", status);
    run(p.id, recordAttendance, fd);
  };

  if (participants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-10 text-center text-sm text-muted">
        No registrations yet. They&apos;ll appear here as members sign up.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Filter registrations" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.filter((f) => f.key === "ALL" || counts[f.key]).map((f) => (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
            className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
              filter === f.key ? "border-foreground bg-foreground text-ink" : "border-ink-border text-muted hover:text-foreground")}>
            {f.label} <span className="opacity-75">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
        {rows.map((p) => {
          const busy = pending && busyId === p.id;
          const active = ["PENDING", "CONFIRMED", "WAITLISTED"].includes(p.registration_status);
          const collectable = ["PENDING", "CONFIRMED"].includes(p.registration_status) &&
            ["UNPAID", "REJECTED", "PROOF_SUBMITTED"].includes(p.payment_status);
          return (
            <li key={p.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center" aria-busy={busy}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">{p.member_name ?? "Member"}</p>
                <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  {p.member_email ? (
                    <a href={`mailto:${p.member_email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{p.member_email}</span>
                    </a>
                  ) : null}
                  {p.member_phone ? (
                    <a href={`tel:${p.member_phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Phone className="h-3 w-3" aria-hidden />{p.member_phone}
                    </a>
                  ) : null}
                  <span>Registered {formatDate(p.joined_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <StatusBadge kind="registration" status={p.registration_status} />
                  {p.payment_status !== "NOT_REQUIRED" ? (
                    <Badge variant={statusTone({ kind: "payment", status: p.payment_status }).tone} dot>
                      {eventPaymentStatusLabel[p.payment_status]} · {formatTnd(p.amount_due_tnd)}
                    </Badge>
                  ) : <StatusBadge kind="payment" status="NOT_REQUIRED" />}
                  {p.attendance_status !== "UNMARKED" ? (
                    <StatusBadge kind="attendance" status={p.attendance_status} />
                  ) : null}
                </div>
                {p.payment_method && !["PAID", "NOT_REQUIRED", "WAIVED"].includes(p.payment_status) ? (
                  <p className="text-xs text-muted">
                    Plans to pay {p.payment_method === "CASH" ? "in person" : `by bank transfer${p.planned_payment_date ? ` on ${formatDate(p.planned_payment_date, { weekday: "short", day: "numeric", month: "short" })}` : ""}`}
                  </p>
                ) : null}
                {p.decision_reason ? <p className="text-xs text-muted">Note: {p.decision_reason}</p> : null}
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {p.registration_status === "PENDING" || p.registration_status === "WAITLISTED" ? (
                  <>
                    <Button size="sm" onClick={() => decide(p, "CONFIRM")} disabled={busy} className="gap-1.5">
                      <Check className="h-4 w-4" aria-hidden /> Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "decline", p })} disabled={busy} className="gap-1.5">
                      <X className="h-4 w-4" aria-hidden /> Decline
                    </Button>
                  </>
                ) : null}
                {p.open_submission_id ? (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link href={`/admin/payments?submission=${p.open_submission_id}`}>
                      <FileSearch className="h-4 w-4" aria-hidden /> Review proof
                    </Link>
                  </Button>
                ) : null}
                {collectable ? (
                  <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "pay", p })} disabled={busy} className="gap-1.5">
                    <Banknote className="h-4 w-4" aria-hidden /> Record payment
                  </Button>
                ) : null}
                {p.registration_status === "CONFIRMED" && eventStarted ? (
                  <div className="inline-flex overflow-hidden rounded-md border border-ink-border" role="group" aria-label={`Attendance for ${p.member_name ?? "member"}`}>
                    {(["ATTENDED", "NO_SHOW"] as const).map((s) => (
                      <button key={s} type="button" disabled={busy}
                        aria-pressed={p.attendance_status === s}
                        onClick={() => attendance(p, p.attendance_status === s ? "UNMARKED" : s)}
                        className={cn("h-9 px-3 text-xs font-medium transition-colors disabled:opacity-60",
                          p.attendance_status === s ? (s === "ATTENDED" ? "bg-emerald-600 text-white" : "bg-zinc-600 text-white") : "text-muted hover:bg-ink-soft")}>
                        {s === "ATTENDED" ? "Attended" : "No-show"}
                      </button>
                    ))}
                  </div>
                ) : null}
                {active && p.registration_status !== "PENDING" && p.registration_status !== "WAITLISTED" ? (
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "cancel", p })} disabled={busy}
                    className="gap-1.5 text-muted hover:text-primary">
                    <UserX className="h-4 w-4" aria-hidden /> Cancel
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <FormDialog
        open={dialog?.kind === "cancel" || dialog?.kind === "decline"}
        title={dialog?.kind === "cancel" ? "Cancel registration" : "Decline request"}
        description={dialog ? `${dialog.p.member_name ?? "The member"} will be notified with your reason.` : null}
        submitLabel={dialog?.kind === "cancel" ? "Cancel registration" : "Decline"}
        danger
        pending={pending}
        onClose={() => setDialog(null)}
        onSubmit={(fd) => {
          if (!dialog || dialog.kind === "pay") return;
          const reason = String(fd.get("reason") ?? "").trim();
          if (dialog.kind === "cancel" && !reason) {
            toast.error("Give the member a reason for the cancellation.");
            return;
          }
          decide(dialog.p, dialog.kind === "cancel" ? "CANCEL" : "REJECT", reason || undefined);
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="reason" className="text-sm">
            Reason {dialog?.kind === "decline" ? <span className="text-muted">(optional)</span> : null}
          </label>
          <textarea id="reason" name="reason" rows={3} maxLength={500} className={fieldClass(false, "resize-y")}
            placeholder={dialog?.kind === "cancel" ? "e.g. Session moved — you're welcome to join next week" : "e.g. This session is for advanced members"} />
        </div>
        {dialog?.kind === "cancel" && dialog.p.payment_status === "PAID" ? (
          <p className="text-xs text-muted">Their confirmed payment stays recorded. Handle any refund with them directly.</p>
        ) : null}
      </FormDialog>

      <FormDialog
        open={dialog?.kind === "pay"}
        title="Record payment received"
        description={dialog?.kind === "pay" ? <>Amount due: <strong>{formatTnd(dialog.p.amount_due_tnd)}</strong>. Record only money you actually received.</> : null}
        submitLabel="Record payment"
        pending={pending}
        onClose={() => setDialog(null)}
        onSubmit={(fd) => {
          if (dialog?.kind !== "pay") return;
          fd.set("registrationId", dialog.p.id);
          run(dialog.p.id, recordInPersonPayment, fd, () => setDialog(null));
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="pay-amount" className="text-sm">Amount received (TND)</label>
          <input id="pay-amount" name="amount" type="number" inputMode="decimal" step="0.001" min="0"
            defaultValue={dialog?.kind === "pay" ? dialog.p.amount_due_tnd : undefined} className={fieldClass(false)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pay-note" className="text-sm">Note <span className="text-muted">(optional)</span></label>
          <input id="pay-note" name="note" maxLength={500} placeholder="e.g. Cash at the gym" className={fieldClass(false)} />
        </div>
      </FormDialog>
      <span className="sr-only" aria-live="polite">{pending ? "Saving…" : ""}</span>
      <input type="hidden" value={eventId} readOnly />
    </div>
  );
}
