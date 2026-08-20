"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNews } from "@/lib/actions/content";
import type { ContentActionState } from "@/lib/actions/content";

export function NewsCreateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      const result = await createNews(_prev, formData);
      if (result.ok && result.id) router.push(`/admin/content/news/${result.id}`);
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
          placeholder="e.g. Training Tips for Beginners"
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
          placeholder="training-tips-for-beginners"
        />
        <p className="text-xs text-muted">
          URL-friendly identifier. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cover_image_url" className="text-sm font-medium">
          Cover image URL
        </label>
        <input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="content" className="text-sm font-medium">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={12}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="Write your article content here. Separate paragraphs with blank lines."
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="is_published"
          name="is_published"
          type="checkbox"
          className="h-4 w-4 rounded border-ink-border"
          value="true"
        />
        <label htmlFor="is_published" className="text-sm font-medium">
          Publish immediately
        </label>
      </div>

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Creating..." : "Create article"}
      </Button>
    </form>
  );
}
