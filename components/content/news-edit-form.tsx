"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNews, deleteNews } from "@/lib/actions/content";
import type { ContentActionState } from "@/lib/actions/content";
import type { AdminNewsItem } from "@/lib/types/content";

interface NewsEditFormProps {
  article: AdminNewsItem & {
    content: string | null;
    cover_image_url: string | null;
    created_by: string;
  };
}

export function NewsEditForm({ article }: NewsEditFormProps) {
  const router = useRouter();

  const [updateState, updateAction, isPending] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      formData.set("articleId", article.id);
      const result = await updateNews(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as ContentActionState,
  );

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      formData.set("articleId", article.id);
      const result = await deleteNews(_prev, formData);
      if (result.ok) router.push("/admin/content/news");
      return result;
    },
    { ok: false } as ContentActionState,
  );

  return (
    <div className="space-y-8">
      {/* Delete section */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Danger zone</p>
            <p className="text-xs text-muted">Permanently delete this article.</p>
          </div>
          <form action={deleteAction}>
            <input type="hidden" name="articleId" value={article.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </form>
        </div>
        {deleteState.message && !deleteState.ok ? (
          <p className="mt-2 text-xs text-destructive">{deleteState.message}</p>
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

        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={article.title}
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={article.slug}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cover_image_url" className="text-sm font-medium">
            Cover image URL
          </label>
          <input
            id="cover_image_url"
            name="cover_image_url"
            type="url"
            defaultValue={article.cover_image_url ?? ""}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="content" className="text-sm font-medium">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            rows={16}
            defaultValue={article.content ?? ""}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="is_published"
            name="is_published"
            type="checkbox"
            defaultChecked={article.is_published}
            className="h-4 w-4 rounded border-ink-border"
            value="true"
          />
          <label htmlFor="is_published" className="text-sm font-medium">
            Published
          </label>
        </div>

        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
