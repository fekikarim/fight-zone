"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Eye, EyeOff, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert, fieldClass, runActionWithToast, useActionForm } from "@/components/ui/form-feedback";
import type { ContentActionState } from "@/lib/actions/content";
import { updateMedia, deleteMedia } from "@/lib/actions/content";
import type { AdminMediaItem } from "@/lib/types/content";
import { mediaTypeLabel } from "@/lib/types/content";

interface MediaManagerProps {
  items: AdminMediaItem[];
}

export function MediaManager({ items }: MediaManagerProps) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-12 text-center">
        <ImageIcon className="h-9 w-9 text-primary" aria-hidden />
        <p className="text-sm text-muted">No media yet — upload your first photo above.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function MediaCard({ item }: { item: AdminMediaItem }) {
  const router = useRouter();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const toggle = () =>
    startToggle(async () => {
      const fd = new FormData();
      fd.set("mediaId", item.id);
      fd.set("is_public", String(!item.is_public));
      const result = await runActionWithToast(() => updateMedia({ ok: false }, fd), {
        success: item.is_public ? "Hidden from the gallery" : "Now visible in the gallery",
      });
      if (result.ok) router.refresh();
    });

  const remove = () =>
    startDelete(async () => {
      const fd = new FormData();
      fd.set("mediaId", item.id);
      const result = await runActionWithToast(() => deleteMedia({ ok: false }, fd), {
        success: "Media deleted",
      });
      setConfirmOpen(false);
      if (result.ok) router.refresh();
    });

  return (
    <div className="group relative overflow-hidden rounded-xl border border-ink-border bg-ink-soft/30">
      <div className="relative aspect-video overflow-hidden bg-ink-soft">
        {item.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.title ?? "Media"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            {mediaTypeLabel[item.type] ?? item.type}
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur ${
            item.is_public ? "bg-emerald-500/20 text-emerald-300" : "bg-ink/70 text-muted"
          }`}
        >
          {item.is_public ? "Public" : "Private"}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title || "Untitled"}</p>
          <p className="mt-0.5 text-xs text-muted">{mediaTypeLabel[item.type] ?? item.type}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            className={`h-10 w-10 p-0 hover:text-foreground ${editing ? "text-foreground" : "text-muted"}`}
            aria-label={editing ? "Close editor" : "Edit details"}
            aria-expanded={editing}
            title="Edit"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggle}
            disabled={isToggling}
            className="h-10 w-10 p-0"
            aria-label={item.is_public ? "Make private" : "Make public"}
            title={item.is_public ? "Make private" : "Make public"}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : item.is_public ? (
              <Eye className="h-4 w-4 text-primary" aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4 text-muted" aria-hidden />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
            className="h-10 w-10 p-0 text-primary hover:text-primary"
            aria-label="Delete"
            title="Delete"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
      </div>

      {editing ? <MediaEditForm item={item} onDone={() => setEditing(false)} /> : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this media?"
        description="It will be removed from the library and the public gallery. This cannot be undone."
        confirmLabel="Delete media"
        pending={isDeleting}
        onClose={() => {
          if (!isDeleting) setConfirmOpen(false);
        }}
        onConfirm={remove}
      />
    </div>
  );
}

function MediaEditForm({ item, onDone }: { item: AdminMediaItem; onDone: () => void }) {
  const router = useRouter();
  const idp = `m-${item.id.slice(0, 8)}`;
  const { state, isPending, formProps } = useActionForm<ContentActionState>(
    updateMedia,
    { ok: false },
    {
      successToast: "Changes saved",
      onSuccess: () => {
        onDone();
        router.refresh();
      },
    },
  );

  return (
    <form {...formProps} className="space-y-3 border-t border-ink-border p-3" aria-busy={isPending}>
      <input type="hidden" name="mediaId" value={item.id} />
      <FormAlert tone="error" message={!state.ok ? state.message : undefined} />
      <div className="space-y-1.5">
        <label htmlFor={`${idp}-title`} className="text-xs font-medium">
          Title
        </label>
        <input
          id={`${idp}-title`}
          name="title"
          maxLength={200}
          defaultValue={item.title ?? ""}
          placeholder="e.g. Saturday sparring session"
          className={fieldClass(false)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idp}-description`} className="text-xs font-medium">
          Description
        </label>
        <textarea
          id={`${idp}-description`}
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={item.description ?? ""}
          placeholder="Optional caption shown in the gallery"
          className={fieldClass(false, "resize-y")}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="flex-1 gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
