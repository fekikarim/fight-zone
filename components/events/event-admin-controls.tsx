"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Ban, Copy, Eye, EyeOff, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { fieldClass } from "@/components/ui/form-feedback";
import {
  deleteEvent,
  duplicateEvent,
  setEventInvitation,
  setEventStatus,
  type EventActionState,
} from "@/lib/actions/events";
import type { EventStatus } from "@/lib/types/events";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (
    action: (p: EventActionState, fd: FormData) => Promise<EventActionState>,
    fields: Record<string, string>,
    onOk?: (res: EventActionState) => void,
  ) =>
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      try {
        const res = await action({ ok: false }, fd);
        if (!res.ok) {
          toast.error(res.message ?? "That didn't work.");
          return;
        }
        toast.success(res.message ?? "Saved");
        if (onOk) onOk(res);
        else router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  return { pending, run, router };
}

interface ControlsProps {
  eventId: string;
  status: EventStatus;
  seatsTaken: number;
}

/** Publish / draft / cancel / archive / duplicate / delete-draft. */
export function EventLifecycleControls({ eventId, status, seatsTaken }: ControlsProps) {
  const { pending, run, router } = useAction();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setStatus = (s: EventStatus, reason?: string) =>
    run(setEventStatus, { eventId, status: s, ...(reason ? { reason } : {}) }, () => {
      setCancelOpen(false);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" ? (
        <Button onClick={() => setStatus("PUBLISHED")} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />} Publish
        </Button>
      ) : null}
      {status === "PUBLISHED" && seatsTaken === 0 ? (
        <Button variant="outline" onClick={() => setStatus("DRAFT")} disabled={pending} className="gap-2">
          <EyeOff className="h-4 w-4" aria-hidden /> Unpublish
        </Button>
      ) : null}
      {status === "PUBLISHED" ? (
        <Button variant="outline" onClick={() => setCancelOpen(true)} disabled={pending} className="gap-2">
          <Ban className="h-4 w-4" aria-hidden /> Cancel event
        </Button>
      ) : null}
      {status === "CANCELLED" || status === "PUBLISHED" ? (
        <Button variant="ghost" onClick={() => setStatus("ARCHIVED")} disabled={pending} className="gap-2 text-muted">
          <Archive className="h-4 w-4" aria-hidden /> Archive
        </Button>
      ) : null}
      {status === "ARCHIVED" ? (
        <Button variant="outline" onClick={() => setStatus("DRAFT")} disabled={pending} className="gap-2">
          Restore to draft
        </Button>
      ) : null}
      <Button variant="ghost" disabled={pending} className="gap-2 text-muted"
        onClick={() => run(duplicateEvent, { eventId }, (res) => res.eventId && router.push(`/admin/events/${res.eventId}`))}>
        <Copy className="h-4 w-4" aria-hidden /> Duplicate
      </Button>
      {status === "DRAFT" && seatsTaken === 0 ? (
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} disabled={pending} className="gap-2 text-muted hover:text-primary">
          <Trash2 className="h-4 w-4" aria-hidden /> Delete draft
        </Button>
      ) : null}

      <FormDialog
        open={cancelOpen}
        title="Cancel this event?"
        description="Every registered and waitlisted member is notified with your message. Registrations and payments stay on record."
        submitLabel="Cancel event"
        danger
        pending={pending}
        onClose={() => setCancelOpen(false)}
        onSubmit={(fd) => setStatus("CANCELLED", String(fd.get("reason") ?? "").trim() || undefined)}
      >
        <div className="space-y-1.5">
          <label htmlFor="cancel-reason" className="text-sm">Message to members <span className="text-muted">(recommended)</span></label>
          <textarea id="cancel-reason" name="reason" rows={3} maxLength={500} className={fieldClass(false, "resize-y")}
            placeholder="e.g. Coach unavailable — paid members will be contacted about their payment." />
        </div>
      </FormDialog>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete this draft?"
        description="The draft is removed permanently. Published events can't be deleted — cancel or archive them instead."
        confirmLabel="Delete draft"
        pendingLabel="Deleting…"
        pending={pending}
        onClose={() => !pending && setDeleteOpen(false)}
        onConfirm={() => run(deleteEvent, { eventId }, () => router.push("/admin/events"))}
      />
    </div>
  );
}

interface InvitationsProps {
  eventId: string;
  invited: Array<{ member_id: string; full_name: string | null; email: string }>;
  members: Array<{ id: string; full_name: string | null; email: string }>;
}

/** Private events are invitation-only (enforced by RLS). */
export function EventInvitationsPanel({ eventId, invited, members }: InvitationsProps) {
  const { pending, run } = useAction();
  const [selected, setSelected] = useState("");
  const invitedIds = new Set(invited.map((i) => i.member_id));
  const options = members.filter((m) => !invitedIds.has(m.id));

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!selected) return toast.error("Choose a member to invite.");
          run(setEventInvitation, { eventId, memberId: selected, invited: "true" }, () => setSelected(""));
        }}
      >
        <label htmlFor="invite-member" className="sr-only">Member to invite</label>
        <select id="invite-member" value={selected} onChange={(e) => setSelected(e.target.value)} className={fieldClass(false, "sm:flex-1")}>
          <option value="">Choose a member…</option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ? `${m.full_name} — ${m.email}` : m.email}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending || !selected} className="gap-2">
          <UserPlus className="h-4 w-4" aria-hidden /> Invite
        </Button>
      </form>
      {invited.length ? (
        <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
          {invited.map((i) => (
            <li key={i.member_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 truncate">{i.full_name ?? i.email} <span className="text-muted">· {i.email}</span></span>
              <Button size="sm" variant="ghost" disabled={pending} aria-label={`Remove invitation for ${i.full_name ?? i.email}`}
                onClick={() => run(setEventInvitation, { eventId, memberId: i.member_id, invited: "false" })}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nobody is invited yet. Only invited members can see and register for this event.</p>
      )}
    </div>
  );
}
