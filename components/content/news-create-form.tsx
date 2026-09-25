"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNews } from "@/lib/actions/content";
import type { ContentActionState } from "@/lib/actions/content";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { NEWS_CATEGORIES } from "@/lib/validations/content";
import { newsCategoryLabel } from "@/lib/types/content";

/** Slugifies a title for the URL identifier (mirrors the server regex). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const inputClass =
  "w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm";

export function NewsCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
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
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={inputClass}
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
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className={`${inputClass} font-mono`}
          placeholder="training-tips-for-beginners"
        />
        <p className="text-xs text-muted">
          Auto-generated from the title; you can edit it. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select id="category" name="category" defaultValue="GENERAL" className={inputClass}>
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {newsCategoryLabel[c]}
              </option>
            ))}
          </select>
        </div>
      <ImageUploadField name="cover_image_url" kind="news" label="Cover image" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="text-sm font-medium">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={300}
          className={inputClass}
          placeholder="Short summary for cards and previews (auto-derived from content if left empty)."
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
          className={inputClass}
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
