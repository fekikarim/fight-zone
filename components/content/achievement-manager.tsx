"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from "@/lib/actions/content";
import { achievementTypeLabel } from "@/lib/types/content";
import type { ContentActionState } from "@/lib/actions/content";
import type { AdminAchievementItem } from "@/lib/types/content";

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

export function AchievementCreateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      const result = await createAchievement(_prev, formData);
      if (result.ok && result.id) router.push("/admin/content/achievements");
      return result;
    },
    { ok: false } as ContentActionState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="e.g. Regional Championship Gold Medal"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="type" className="text-sm font-medium">
          Type <span className="text-destructive">*</span>
        </label>
        <select
          id="type"
          name="type"
          required
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
        >
          <option value="CHAMPIONSHIP">Championship</option>
          <option value="CERTIFICATION">Certification</option>
          <option value="AWARD">Award</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="Optional description of the achievement..."
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="image_url" className="text-sm font-medium">
          Image URL
        </label>
        <input
          id="image_url"
          name="image_url"
          type="url"
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </div>

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Creating..." : "Create achievement"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Manager (list with inline actions)
// ---------------------------------------------------------------------------

export function AchievementManager({ items }: { items: AdminAchievementItem[] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted">
        No achievements yet. Create your first one above.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AchievementRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function AchievementRow({ item }: { item: AdminAchievementItem }) {
  const [editState, editAction, isEditing] = useActionState(
    async (prev: ContentActionState, formData: FormData) => {
      formData.set("achievementId", item.id);
      return updateAchievement(prev, formData);
    },
    { ok: false } as ContentActionState,
  );

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      formData.set("achievementId", item.id);
      return deleteAchievement(_prev, formData);
    },
    { ok: false } as ContentActionState,
  );

  return (
    <div className="flex items-center gap-4 rounded-lg border border-ink-border bg-ink-soft/30 p-4">
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.title}
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="rounded bg-ink-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {achievementTypeLabel[item.type] ?? item.type}
          </span>
          {item.date ? <span>{item.date}</span> : null}
        </div>
        {item.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1">
        <form action={editAction} className="contents">
          <input type="hidden" name="achievementId" value={item.id} />
          <input type="hidden" name="title" value={item.title} />
          <input type="hidden" name="type" value={item.type} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={isEditing}
            className="h-7 w-7 p-0 text-muted hover:text-foreground"
            title="Keep (refreshes timestamp)"
          >
            {isEditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          </Button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="achievementId" value={item.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </form>
      </div>

      {editState.message && !editState.ok ? (
        <p className="col-span-full text-xs text-destructive">{editState.message}</p>
      ) : null}
      {deleteState.message && !deleteState.ok ? (
        <p className="col-span-full text-xs text-destructive">{deleteState.message}</p>
      ) : null}
    </div>
  );
}
