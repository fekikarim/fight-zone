"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMembershipPlan, toggleMembershipPlanActive } from "@/lib/actions/memberships";
import type { MembershipActionState } from "@/lib/actions/memberships";
import type { MembershipPlan } from "@/lib/types/memberships";

interface PlanEditFormProps {
  plan: MembershipPlan;
}

export function PlanEditForm({ plan }: PlanEditFormProps) {
  const router = useRouter();

  const [updateState, updateAction, isPending] = useActionState(
    async (_prev: MembershipActionState, formData: FormData) => {
      formData.set("planId", plan.id);
      const result = await updateMembershipPlan(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as MembershipActionState,
  );

  const [toggleState, toggleAction, isToggling] = useActionState(
    async (_prev: MembershipActionState, formData: FormData) => {
      formData.set("planId", plan.id);
      const result = await toggleMembershipPlanActive(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as MembershipActionState,
  );

  return (
    <div className="space-y-8">
      {/* Toggle active */}
      <div className="rounded-lg border border-ink-border bg-ink-soft/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Status: {plan.is_active ? "Active" : "Inactive"}
            </p>
            <p className="text-xs text-muted">
              {plan.is_active
                ? "Deactivating hides this plan from the public pricing page."
                : "Activating makes this plan visible and available for subscriptions."}
            </p>
          </div>
          <form action={toggleAction}>
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="is_active" value={String(!plan.is_active)} />
            <Button type="submit" variant="outline" size="sm" disabled={isToggling} className="gap-2">
              {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {plan.is_active ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </div>
        {toggleState.message ? (
          <p className={`mt-2 text-xs ${toggleState.ok ? "text-primary" : "text-destructive"}`}>
            {toggleState.message}
          </p>
        ) : null}
      </div>

      {/* Edit form */}
      <form action={updateAction} className="space-y-6">
        {updateState.message && !updateState.ok ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {updateState.message}
          </div>
        ) : null}
        {updateState.message && updateState.ok ? (
          <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
            {updateState.message}
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Plan name</label>
            <input id="name" name="name" defaultValue={plan.name} required className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="slug" className="text-sm font-medium">Slug</label>
            <input id="slug" name="slug" defaultValue={plan.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm font-mono" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <textarea id="description" name="description" rows={3} defaultValue={plan.description ?? ""} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="tier" className="text-sm font-medium">Tier</label>
            <select id="tier" name="tier" defaultValue={plan.tier} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm">
              <option value="ADULT">Adult</option>
              <option value="STUDENT">Student</option>
              <option value="KIDS">Kids</option>
              <option value="FAMILY">Family</option>
              <option value="PRO_FIGHTER">Pro Fighter</option>
              <option value="UNLIMITED">Unlimited</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_interval" className="text-sm font-medium">Billing interval</label>
            <select id="billing_interval" name="billing_interval" defaultValue={plan.billing_interval} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm">
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUAL">Annual</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="price" className="text-sm font-medium">Price (TND)</label>
            <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={plan.price} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="session_credits" className="text-sm font-medium">Session credits</label>
            <input id="session_credits" name="session_credits" type="number" min="0" defaultValue={plan.session_credits ?? ""} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sort_order" className="text-sm font-medium">Sort order</label>
            <input id="sort_order" name="sort_order" type="number" defaultValue={plan.sort_order} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="features" className="text-sm font-medium">Features (one per line)</label>
          <textarea id="features" name="features" rows={5} defaultValue={plan.features.join("\n")} className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <input id="is_popular" name="is_popular" type="checkbox" defaultChecked={plan.is_popular} className="h-4 w-4 rounded" value="true" />
          <label htmlFor="is_popular" className="text-sm font-medium">Most popular</label>
        </div>

        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
