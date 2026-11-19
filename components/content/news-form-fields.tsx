"use client";

import { useState } from "react";
import { FieldError, fieldA11y, fieldClass, type FieldErrors } from "@/components/ui/form-feedback";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { NEWS_CATEGORIES, NEWS_LIMITS } from "@/lib/validations/content";
import { newsCategoryLabel } from "@/lib/types/content";

interface NewsFormFieldsProps {
  article?: {
    title: string;
    slug: string;
    category: string;
    excerpt: string | null;
    content: string | null;
    cover_image_url: string | null;
    is_published: boolean;
  };
  errors: FieldErrors;
  disabled?: boolean;
}

const labelClass = "text-sm font-medium text-foreground";
const hintClass = "text-xs text-muted";

/** Fields shared by the news create and edit forms. */
export function NewsFormFields({ article, errors, disabled }: NewsFormFieldsProps) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerptLength, setExcerptLength] = useState(article?.excerpt?.length ?? 0);
  const [published, setPublished] = useState(article?.is_published ?? false);

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-80">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-primary" aria-hidden>*</span>
          </label>
          <span className="text-[11px] tabular-nums text-muted">
            {title.length}/{NEWS_LIMITS.titleMax}
          </span>
        </div>
        <input
          id="title"
          name="title"
          required
          maxLength={NEWS_LIMITS.titleMax}
          value={title}
          autoComplete="off"
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass(Boolean(errors.title))}
          placeholder="e.g. 5 Footwork Drills Every Beginner Should Master"
          {...fieldA11y("title", errors.title)}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      {article ? (
        <p className="text-xs text-muted">
          Public link: <span className="font-mono text-foreground/80">/news/{article.slug}</span> — it stays the same when you edit, so shared links keep working.
        </p>
      ) : (
        <p className="text-xs text-muted">The public link is created automatically from the title when you save.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={article?.category ?? "GENERAL"}
            className={fieldClass(Boolean(errors.category))}
          >
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {newsCategoryLabel[c]}
              </option>
            ))}
          </select>
          <p className={hintClass}>Used for filtering on the news page.</p>
        </div>
        <div className="space-y-1.5">
          <ImageUploadField
            name="cover_image_url"
            kind="news"
            label="Cover image"
            defaultValue={article?.cover_image_url}
          />
          <FieldError id="cover_image_url-error" message={errors.cover_image_url} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="excerpt" className={labelClass}>
            Excerpt
          </label>
          <span className="text-[11px] tabular-nums text-muted">
            {excerptLength}/{NEWS_LIMITS.excerptMax}
          </span>
        </div>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={NEWS_LIMITS.excerptMax}
          defaultValue={article?.excerpt ?? ""}
          onChange={(e) => setExcerptLength(e.target.value.length)}
          className={fieldClass(Boolean(errors.excerpt), "resize-y")}
          placeholder="One or two sentences shown on news cards. Leave empty to use the start of the article."
          {...fieldA11y("excerpt", errors.excerpt)}
        />
        <FieldError id="excerpt-error" message={errors.excerpt} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="content" className={labelClass}>
          Content {published ? <span className="text-primary" aria-hidden>*</span> : null}
        </label>
        <textarea
          id="content"
          name="content"
          rows={14}
          maxLength={NEWS_LIMITS.contentMax}
          defaultValue={article?.content ?? ""}
          className={fieldClass(Boolean(errors.content), "min-h-60 resize-y leading-relaxed")}
          placeholder={"Write the article here.\n\nLeave a blank line between paragraphs."}
          {...fieldA11y("content", errors.content)}
        />
        {errors.content ? (
          <FieldError id="content-error" message={errors.content} />
        ) : (
          <p className={hintClass}>Separate paragraphs with a blank line.</p>
        )}
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-ink-border accent-primary"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">{article ? "Published" : "Publish immediately"}</span>
          <span className={hintClass}>
            {published ? "Visible on the public news page." : "Saved as a draft — only staff can see it."}
          </span>
        </span>
      </label>
      <input type="hidden" name="is_published" value={published ? "true" : "false"} />
    </fieldset>
  );
}
