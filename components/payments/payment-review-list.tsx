"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/ui/form-dialog";
import { fieldClass } from "@/components/ui/form-feedback";
import { reviewPayment } from "@/lib/actions/events";
import { formatTnd } from "@/lib/types/events";
import type { PaymentSubmissionItem } from "@/lib/payments/queries";
import { cn, formatDate } from "@/lib/utils";

/** Seif compares the proof with the amount due, then confirms or rejects. */
export function PaymentReviewList({ items, highlight, reviewable }: { items: PaymentSubmissionItem[]; highlight?: string; reviewable: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ kind: "confirm" | "reject"; item: PaymentSubmissionItem } | null>(null);

  const submit = (fd: FormData) => {
    if (!dialog) return;
    fd.set("submissionId", dialog.item.id);
    fd.set("decision", dialog.kind === "confirm" ? "CONFIRM" : "REJECT");
    if (dialog.kind === "reject" && !String(fd.get("reason") ?? "").trim()) {
      toast.error("Tell the member why the proof was rejected.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await reviewPayment({ ok: false }, fd);
        if (!res.ok) return void toast.error(res.message ?? "That didn't work.");
        toast.success(res.message ?? "Saved");
        setDialog(null);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-12 text-center text-sm text-muted">
        {reviewable ? "No payment proofs waiting for review. 🎉" : "Nothing here yet."}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((it) => {
          const mismatch = Math.round(it.amount_declared * 1000) !== Math.round(it.amount_due * 1000);
          return (
            <li key={it.id} id={`submission-${it.id}`}
              className={cn("rounded-xl border bg-ink-soft/30 p-4 sm:p-5", highlight === it.id ? "border-primary ring-1 ring-primary/40" : "border-ink-border")}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <a href={`/api/payment-proofs/${it.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex h-28 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-ink-border bg-ink text-sm text-muted transition-colors hover:border-primary/50 hover:text-foreground md:w-40"
                  aria-label={`Open proof from ${it.member_name ?? "member"} in a new tab`}>
                  <FileText className="h-6 w-6" aria-hidden />
                  <span className="inline-flex items-center gap-1">Open proof <ExternalLink className="h-3.5 w-3.5" aria-hidden /></span>
                </a>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{it.member_name ?? "Member"} <span className="text-sm font-normal text-muted">· {it.member_email}</span></p>
                    <span className="text-xs text-muted">Sent {formatDate(it.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <Link href={`/admin/events/${it.event_id}`} className="block truncate text-sm text-primary hover:underline">
                    {it.event_title} · {formatDate(it.event_start, { month: "short", day: "numeric" })}
                  </Link>
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-muted">Declared</dt><dd className="font-medium">{formatTnd(it.amount_declared)}</dd></div>
                    <div><dt className="text-xs text-muted">Amount due</dt><dd className="font-medium">{formatTnd(it.amount_due)}</dd></div>
                    <div className="col-span-2 sm:col-span-1"><dt className="text-xs text-muted">Reference</dt><dd className="truncate">{it.transfer_reference ?? "—"}</dd></div>
                  </dl>
                  {mismatch ? <Badge variant="outline">Declared amount differs from amount due</Badge> : null}
                  {it.member_note ? <p className="rounded-md bg-ink-soft px-3 py-2 text-sm text-muted">“{it.member_note}”</p> : null}
                  {it.rejection_reason ? <p className="text-sm text-muted">Rejected: {it.rejection_reason}</p> : null}
                  {reviewable ? (
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                      <Button onClick={() => setDialog({ kind: "confirm", item: it })} disabled={pending} className="gap-2">
                        <Check className="h-4 w-4" aria-hidden /> Confirm payment
                      </Button>
                      <Button variant="outline" onClick={() => setDialog({ kind: "reject", item: it })} disabled={pending} className="gap-2">
                        <X className="h-4 w-4" aria-hidden /> Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <FormDialog
        open={dialog?.kind === "confirm"}
        title="Confirm payment"
        description="Only confirm after checking the money actually arrived. This records income and notifies the member."
        submitLabel="Confirm payment"
        pending={pending}
        onClose={() => setDialog(null)}
        onSubmit={submit}
      >
        <div className="space-y-1.5">
          <label htmlFor="confirm-amount" className="text-sm">Amount received (TND)</label>
          <input id="confirm-amount" name="amount" type="number" inputMode="decimal" step="0.001" min="0"
            defaultValue={dialog?.item.amount_declared} className={fieldClass(false)} />
        </div>
      </FormDialog>
      <FormDialog
        open={dialog?.kind === "reject"}
        title="Reject proof"
        description="The member sees your reason and can upload a new proof."
        submitLabel="Reject proof"
        danger
        pending={pending}
        onClose={() => setDialog(null)}
        onSubmit={submit}
      >
        <div className="space-y-1.5">
          <label htmlFor="reject-reason" className="text-sm">Reason</label>
          <textarea id="reject-reason" name="reason" rows={3} maxLength={500} className={fieldClass(false, "resize-y")}
            placeholder="e.g. The transfer hasn't arrived yet / amount is 20 TND instead of 30 TND" />
        </div>
      </FormDialog>
    </>
  );
}
