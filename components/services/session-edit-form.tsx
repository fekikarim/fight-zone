"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSession } from "@/lib/actions/services";
import type { SessionActionState } from "@/lib/actions/services";
import { DISCIPLINES, disciplineLabel, sessionTypeLabel, skillLevelLabel } from "@/lib/types/services";
import type { Discipline } from "@/lib/types/services";

const types = Object.entries(sessionTypeLabel);
const levels = Object.entries(skillLevelLabel);

interface SessionEditFormProps {
  session: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    discipline?: string | null;
    level?: string | null;
    duration_min: number;
    price: number;
    is_active: boolean;
  };
}

export function SessionEditForm({ session }: SessionEditFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: SessionActionState, formData: FormData) => {
      formData.set("sessionId", session.id);
      const result = await updateSession(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as SessionActionState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}
      {state.message && state.ok ? (
        <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={session.title}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={session.description ?? ""}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            Session type <span className="text-destructive">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={session.type}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          >
            {types.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="discipline" className="text-sm font-medium">
            Discipline
          </label>
          <select
            id="discipline"
            name="discipline"
            defaultValue={session.discipline ?? ""}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {disciplineLabel[d as Discipline]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="level" className="text-sm font-medium">
            Level
          </label>
          <select
            id="level"
            name="level"
            defaultValue={session.level ?? ""}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {levels.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="duration_min" className="text-sm font-medium">
            Duration (min) <span className="text-destructive">*</span>
          </label>
          <input
            id="duration_min"
            name="duration_min"
            type="number"
            min={1}
            max={480}
            required
            defaultValue={session.duration_min}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="price" className="text-sm font-medium">
            Price <span className="text-destructive">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step={0.01}
            required
            defaultValue={session.price}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          defaultChecked={session.is_active}
          className="h-4 w-4 rounded border-ink-border"
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Active (visible to members)
        </label>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
