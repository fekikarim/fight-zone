"use client";

import { useActionState } from "react";
import { Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMedia, deleteMedia } from "@/lib/actions/content";
import type { ContentActionState } from "@/lib/actions/content";
import type { AdminMediaItem } from "@/lib/types/content";
import { mediaTypeLabel } from "@/lib/types/content";

interface MediaManagerProps {
  items: AdminMediaItem[];
}

export function MediaManager({ items }: MediaManagerProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted">
        No media uploaded yet. Use the upload zone above to add files.
      </p>
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
  const [toggleState, toggleAction, isToggling] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      formData.set("mediaId", item.id);
      formData.set("is_public", String(!item.is_public));
      return updateMedia(_prev, formData);
    },
    { ok: false } as ContentActionState,
  );

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      formData.set("mediaId", item.id);
      return deleteMedia(_prev, formData);
    },
    { ok: false } as ContentActionState,
  );

  return (
    <div className="group relative overflow-hidden rounded-xl border border-ink-border bg-ink-soft/30">
      <div className="aspect-video overflow-hidden bg-ink-soft">
        {item.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.title ?? "Media"}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            {mediaTypeLabel[item.type] ?? item.type}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {item.title ? (
              <p className="truncate text-sm font-medium">{item.title}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted">
              {mediaTypeLabel[item.type] ?? item.type}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <form action={toggleAction}>
              <input type="hidden" name="mediaId" value={item.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={isToggling}
                className="h-7 w-7 p-0"
                title={item.is_public ? "Make private" : "Make public"}
              >
                {item.is_public ? (
                  <Eye className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted" />
                )}
              </Button>
            </form>
            <form action={deleteAction}>
              <input type="hidden" name="mediaId" value={item.id} />
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
        </div>
      </div>

      {toggleState.message && !toggleState.ok ? (
        <p className="px-3 pb-2 text-xs text-destructive">{toggleState.message}</p>
      ) : null}
      {deleteState.message && !deleteState.ok ? (
        <p className="px-3 pb-2 text-xs text-destructive">{deleteState.message}</p>
      ) : null}
    </div>
  );
}
