"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Gift, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { FieldError, FormAlert, fieldA11y, fieldClass, useActionForm } from "@/components/ui/form-feedback";
import { deleteBadge, previewBadgeImpact, redeemReward, saveBadge, setRewardStatus, type BadgeActionState } from "@/lib/actions/badges";
import { BADGE_ACCENTS, BADGE_ICONS, BADGE_TIERS } from "@/lib/validations/badges";
import { formatTnd } from "@/lib/types/events";
import { BadgeMedal } from "@/components/badges/badge-medal";
import { formatDate } from "@/lib/utils";
import { Select } from "@/components/ui/select";

export interface BadgeDef {
  id: string; name: string; description: string | null; threshold: number; tier: string; icon: string; accent: string;
  is_active: boolean; reward_type: string | null; reward_value_tnd: number | null; reward_max_value_tnd: number | null;
  reward_expiry_days: number | null; reward_requires_approval: boolean; reward_total_cap: number | null; reward_terms: string | null;
  awarded: number;
}

export function BadgeForm({ badge, onDone }: { badge?: BadgeDef; onDone?: () => void }) {
  const router = useRouter();
  const { state, isPending, fieldErrors: e, formProps } = useActionForm<BadgeActionState>(saveBadge, { ok: false }, {
    successToast: (r) => r.message ?? "Saved",
    onSuccess: () => { if (!badge) formProps.ref.current?.reset(); onDone?.(); router.refresh(); },
  });
  const [rewardType, setRewardType] = useState(badge?.reward_type ?? "NONE");
  const [approval, setApproval] = useState(badge?.reward_requires_approval ?? true);
  const [active, setActive] = useState(badge?.is_active ?? true);
  const [threshold, setThreshold] = useState(badge?.threshold ?? 10);
  const [impact, setImpact] = useState<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void previewBadgeImpact(threshold).then(setImpact).catch(() => setImpact(null));
    }, 400);
    return () => window.clearTimeout(t);
  }, [threshold]);

  const idp = badge ? `b-${badge.id.slice(0, 6)}-` : "nb-";
  return (
    <form {...formProps} className="space-y-4" aria-busy={isPending}>
      {badge ? <input type="hidden" name="id" value={badge.id} /> : null}
      <FormAlert tone="error" message={!state.ok && !Object.values(e).some(Boolean) ? state.message : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${idp}name`} className="text-sm font-medium">Name</label>
          <input id={`${idp}name`} name="name" maxLength={60} defaultValue={badge?.name} placeholder="e.g. Ten Rounds" className={fieldClass(!!e.name)} {...fieldA11y("name", e.name)} />
          <FieldError id="name-error" message={e.name} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idp}threshold`} className="text-sm font-medium">Events attended to earn it</label>
          <input id={`${idp}threshold`} name="threshold" type="number" min={1} max={10000} step={1} value={threshold}
            onChange={(ev) => setThreshold(Number(ev.target.value))} className={fieldClass(!!e.threshold)} {...fieldA11y("threshold", e.threshold)} />
          {e.threshold ? <FieldError id="threshold-error" message={e.threshold} /> : (
            <p className="text-xs text-muted">{impact == null ? " " : `${impact} member(s) already qualify and would receive it on save.`}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`${idp}description`} className="text-sm font-medium">Message shown to members</label>
          <input id={`${idp}description`} name="description" maxLength={300} defaultValue={badge?.description ?? ""} placeholder="e.g. 10 sessions in the ring — respect." className={fieldClass(false)} />
        </div>
        {([["tier", BADGE_TIERS], ["icon", BADGE_ICONS], ["accent", BADGE_ACCENTS]] as const).map(([name, opts]) => (
          <div key={name} className="space-y-1.5">
            <label htmlFor={`${idp}${name}`} className="text-sm font-medium capitalize">{name === "accent" ? "Colour" : name}</label>
            <Select id={`${idp}${name}`} name={name} defaultValue={badge?.[name] ?? opts[0]} className={fieldClass(false, "capitalize")}>
              {opts.map((o) => <option key={o} value={o}>{o.toLowerCase()}</option>)}
            </Select>
          </div>
        ))}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={active} onChange={(ev) => setActive(ev.target.checked)} className="h-5 w-5 accent-primary" /> Active
        </label>
        <input type="hidden" name="is_active" value={active ? "true" : "false"} />
      </div>

      <fieldset className="space-y-3 rounded-xl border border-ink-border p-4">
        <legend className="px-1 text-sm font-semibold">Optional reward</legend>
        <Select name="reward_type" value={rewardType} onChange={(ev) => setRewardType(ev.target.value)} className={fieldClass(false)} aria-label="Reward type">
          <option value="NONE">No reward — recognition only</option>
          <option value="DISCOUNT_TND">Fixed discount on one event</option>
          <option value="FREE_ENTRY">Free entry to one event (up to a price)</option>
        </Select>
        {rewardType !== "NONE" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor={`${idp}val`} className="text-xs text-muted">{rewardType === "FREE_ENTRY" ? "Covers events up to (TND)" : "Discount (TND)"}</label>
              <input id={`${idp}val`} name="reward_value_tnd" type="number" step="0.001" min="0"
                defaultValue={(rewardType === "FREE_ENTRY" ? badge?.reward_max_value_tnd : badge?.reward_value_tnd) ?? ""}
                className={fieldClass(!!e.reward_value_tnd)} {...fieldA11y("reward_value_tnd", e.reward_value_tnd)} />
              <FieldError id="reward_value_tnd-error" message={e.reward_value_tnd} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${idp}exp`} className="text-xs text-muted">Expires after (days)</label>
              <input id={`${idp}exp`} name="reward_expiry_days" type="number" min={1} max={730} defaultValue={badge?.reward_expiry_days ?? ""} placeholder="No expiry"
                className={fieldClass(!!e.reward_expiry_days)} {...fieldA11y("reward_expiry_days", e.reward_expiry_days)} />
              <FieldError id="reward_expiry_days-error" message={e.reward_expiry_days} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${idp}cap`} className="text-xs text-muted">Maximum rewards in total</label>
              <input id={`${idp}cap`} name="reward_total_cap" type="number" min={1} defaultValue={badge?.reward_total_cap ?? ""} placeholder="Unlimited"
                className={fieldClass(!!e.reward_total_cap)} {...fieldA11y("reward_total_cap", e.reward_total_cap)} />
              <FieldError id="reward_total_cap-error" message={e.reward_total_cap} />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <label htmlFor={`${idp}terms`} className="text-xs text-muted">Terms shown to members</label>
              <input id={`${idp}terms`} name="reward_terms" maxLength={500} defaultValue={badge?.reward_terms ?? ""} placeholder="One use, not transferable, not combinable with other offers." className={fieldClass(false)} />
            </div>
            <label className="flex items-start gap-3 text-sm sm:col-span-3">
              <input type="checkbox" checked={approval} onChange={(ev) => setApproval(ev.target.checked)} className="mt-0.5 h-5 w-5 accent-primary" />
              <span>Require my approval before members can use it <span className="block text-xs text-muted">Recommended for financial rewards.</span></span>
            </label>
            <input type="hidden" name="reward_requires_approval" value={approval ? "true" : "false"} />
          </div>
        ) : <input type="hidden" name="reward_requires_approval" value="true" />}
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onDone ? <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button> : null}
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}{badge ? "Save badge" : "Create badge"}
        </Button>
      </div>
    </form>
  );
}

export function BadgeRow({ badge }: { badge: BadgeDef }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const reward = badge.reward_type === "FREE_ENTRY" ? `Free entry up to ${formatTnd(badge.reward_max_value_tnd)}`
    : badge.reward_type === "DISCOUNT_TND" ? `${formatTnd(badge.reward_value_tnd)} off` : "Recognition only";
  return (
    <li className="rounded-xl border border-ink-border bg-ink-soft/30">
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <BadgeMedal icon={badge.icon} accent={badge.accent} size="sm" earned={badge.is_active} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{badge.name} <span className="text-xs text-muted">· {badge.threshold} events</span></p>
          <p className="text-xs text-muted">{reward}{badge.reward_type && badge.reward_requires_approval ? " · needs your approval" : ""} · awarded {badge.awarded}×</p>
        </div>
        {!badge.is_active ? <Badge variant="outline">Inactive</Badge> : null}
        <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)} aria-label={`Edit ${badge.name}`}><Pencil className="h-4 w-4" aria-hidden /></Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} aria-label={`Delete ${badge.name}`} className="text-muted hover:text-primary"><Trash2 className="h-4 w-4" aria-hidden /></Button>
      </div>
      {editing ? <div className="border-t border-ink-border p-4"><BadgeForm badge={badge} onDone={() => setEditing(false)} /></div> : null}
      <ConfirmDialog open={confirm} title="Delete this badge?" pending={pending}
        description={badge.awarded ? "Members already earned it, so it can't be deleted — deactivate it instead." : "It has never been awarded and will be removed."}
        confirmLabel="Delete" onClose={() => !pending && setConfirm(false)}
        onConfirm={() => start(async () => {
          const r = await deleteBadge(badge.id);
          if (!r.ok) toast.error(r.message ?? "Could not delete."); else { toast.success(r.message ?? "Deleted"); router.refresh(); }
          setConfirm(false);
        })} />
    </li>
  );
}

export interface RewardRow {
  id: string; member_name: string | null; badge_name: string | null; reward_type: string; value_tnd: number;
  status: string; expires_at: string | null; created_at: string;
  candidates: Array<{ id: string; label: string }>;
}

export function RewardQueue({ rewards }: { rewards: RewardRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<{ kind: "revoke" | "redeem"; r: RewardRow } | null>(null);
  const run = (fn: () => Promise<BadgeActionState>) => start(async () => {
    const res = await fn();
    if (!res.ok) return void toast.error(res.message ?? "That didn't work.");
    toast.success(res.message ?? "Saved");
    setDialog(null);
    router.refresh();
  });
  if (!rewards.length) return <p className="rounded-xl border border-dashed border-ink-border px-4 py-8 text-center text-sm text-muted">No open rewards.</p>;
  return (
    <>
      <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
        {rewards.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <Gift className="hidden h-5 w-5 text-primary sm:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.member_name ?? "Member"} · {r.reward_type === "FREE_ENTRY" ? `free entry (≤ ${formatTnd(r.value_tnd)})` : `${formatTnd(r.value_tnd)} off`}</p>
              <p className="text-xs text-muted">{r.badge_name ? `From “${r.badge_name}” · ` : ""}{r.status === "PENDING_APPROVAL" ? "Awaiting your approval" : "Available"}{r.expires_at ? ` · expires ${formatDate(r.expires_at, { month: "short", day: "numeric", year: "numeric" })}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.status === "PENDING_APPROVAL" ? (
                <Button size="sm" disabled={pending} onClick={() => run(() => setRewardStatus(r.id, "APPROVE"))} className="gap-1.5"><Check className="h-4 w-4" aria-hidden /> Approve</Button>
              ) : (
                <Button size="sm" disabled={pending || !r.candidates.length} onClick={() => setDialog({ kind: "redeem", r })} title={r.candidates.length ? undefined : "The member has no unpaid registration"}>Apply to a registration</Button>
              )}
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDialog({ kind: "revoke", r })} className="gap-1.5 text-muted"><X className="h-4 w-4" aria-hidden /> Revoke</Button>
            </div>
          </li>
        ))}
      </ul>
      <FormDialog open={dialog?.kind === "revoke"} title="Revoke reward" danger pending={pending} submitLabel="Revoke"
        description="The reward ledger keeps a record with your reason." onClose={() => setDialog(null)}
        onSubmit={(fd) => {
          const reason = String(fd.get("reason") ?? "").trim();
          if (!reason) return void toast.error("A reason is required.");
          if (dialog) run(() => setRewardStatus(dialog.r.id, "REVOKE", reason));
        }}>
        <label htmlFor="revoke-reason" className="text-sm">Reason</label>
        <textarea id="revoke-reason" name="reason" rows={2} maxLength={300} className={fieldClass(false, "resize-y")} />
      </FormDialog>
      <FormDialog open={dialog?.kind === "redeem"} title="Apply reward" pending={pending} submitLabel="Apply reward"
        description="Reduces what the member owes for one unpaid registration. Single use; can't make the price negative." onClose={() => setDialog(null)}
        onSubmit={(fd) => {
          const reg = String(fd.get("registrationId") ?? "");
          if (!reg) return void toast.error("Choose a registration.");
          if (dialog) run(() => redeemReward(dialog.r.id, reg));
        }}>
        <label htmlFor="redeem-reg" className="text-sm">Registration</label>
        <Select id="redeem-reg" name="registrationId" defaultValue="" className={fieldClass(false)}>
          <option value="" disabled>Choose…</option>
          {dialog?.r.candidates.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
      </FormDialog>
    </>
  );
}
