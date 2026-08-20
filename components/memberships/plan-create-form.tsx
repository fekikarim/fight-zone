"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMembershipPlan } from "@/lib/actions/memberships";
import type { MembershipActionState } from "@/lib/actions/memberships";

export function PlanCreateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: MembershipActionState, formData: FormData) => {
      const result = await createMembershipPlan(_prev, formData);
      if (result.ok && result.id) router.push(`/admin/memberships/${result.id}`);
      return result;
    },
    { ok: false } as MembershipActionState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Plan name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
            placeholder="Monthly All-Access"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug <span className="text-destructive">*</span>
          </label>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm font-mono"
            placeholder="monthly-all-access"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="Brief description of the plan..."
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="tier" className="text-sm font-medium">
            Tier <span className="text-destructive">*</span>
          </label>
          <select
            id="tier"
            name="tier"
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          >
            <option value="ADULT">Adult</option>
            <option value="STUDENT">Student</option>
            <option value="KIDS">Kids</option>
            <option value="FAMILY">Family</option>
            <option value="PRO_FIGHTER">Pro Fighter</option>
            <option value="UNLIMITED">Unlimited</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="billing_interval" className="text-sm font-medium">
            Billing interval <span className="text-destructive">*</span>
          </label>
          <select
            id="billing_interval"
            name="billing_interval"
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="price" className="text-sm font-medium">
            Price (TND) <span className="text-destructive">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
            placeholder="120.00"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="session_credits" className="text-sm font-medium">
            Session credits
          </label>
          <input
            id="session_credits"
            name="session_credits"
            type="number"
            min="0"
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
            placeholder="Leave empty for unlimited"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sort_order" className="text-sm font-medium">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="features" className="text-sm font-medium">
          Features (one per line)
        </label>
        <textarea
          id="features"
          name="features"
          rows={5}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="Unlimited group sessions&#10;Open gym access&#10;Locker room access"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <input id="is_popular" name="is_popular" type="checkbox" className="h-4 w-4 rounded" value="true" />
          <label htmlFor="is_popular" className="text-sm font-medium">Most popular</label>
        </div>
        <div className="flex items-center gap-2">
          <input id="is_active" name="is_active" type="checkbox" defaultChecked className="h-4 w-4 rounded" value="true" />
          <label htmlFor="is_active" className="text-sm font-medium">Active</label>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Creating..." : "Create plan"}
      </Button>
    </form>
  );
}
