"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNews, deleteNews } from "@/lib/actions/content";
import type { ContentActionState } from "@/lib/actions/content";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert, runActionWithToast, useActionForm } from "@/components/ui/form-feedback";
import { NewsFormFields } from "@/components/content/news-form-fields";
import type { AdminNewsItem } from "@/lib/types/content";
import { readNewsForm, updateNewsSchema } from "@/lib/validations/content";
import { issuesToFieldErrors } from "@/lib/validations/form-errors";

interface NewsEditFormProps {
  article: AdminNewsItem & {
    content: string | null;
    cover_image_url: string | null;
    created_by: string;
  };
}

function validate(formData: FormData) {
  if (formData.get("cover_image_url__uploading") === "1") {
    return { cover_image_url: "Please wait for the image to finish uploading." };
  }
  const parsed = updateNewsSchema.safeParse(readNewsForm(formData));
  return parsed.success ? null : issuesToFieldErrors(parsed.error.issues);
}

export function NewsEditForm({ article }: NewsEditFormProps) {
  const router = useRouter();
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { state: updateState, isPending, fieldErrors, formProps } = useActionForm<ContentActionState>(
    updateNews,
    { ok: false },
    {
      validate,
      successToast: "Changes saved",
      onSuccess: () => router.push("/admin/news"),
    },
  );
  const saved = updateState.ok;

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      formData.set("articleId", article.id);
      const result = await runActionWithToast(() => deleteNews(_prev, formData), {
        success: "Article deleted",
      });
      if (result.ok) {
        setConfirmOpen(false);
        router.push("/admin/news");
      }
      return result;
    },
    { ok: false } as ContentActionState,
  );

  return (
    <div className="space-y-8">
      {/* Edit form */}
      <form {...formProps} className="space-y-6" aria-busy={isPending}>
        <input type="hidden" name="articleId" value={article.id} />
        <FormAlert tone="error" message={!updateState.ok ? updateState.message : undefined} />

        <NewsFormFields article={article} errors={fieldErrors} disabled={isPending || saved} />

        <div className="flex flex-col-reverse gap-3 border-t border-ink-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/news")} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={isPending || saved} className="gap-2 sm:min-w-44">
            {isPending || saved ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {isPending ? "Saving…" : saved ? "Redirecting…" : "Save changes"}
          </Button>
        </div>
      </form>

      {/* Delete section with confirmation dialog */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-medium">Danger zone</p>
            <p className="text-xs text-muted">Permanently delete this article.</p>
          </div>
          <form ref={deleteFormRef} action={deleteAction}>
            <input type="hidden" name="articleId" value={article.id} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setConfirmOpen(true)}
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              title="Delete this article?"
              description={`"${article.title}" will be permanently removed from the news and blog. This cannot be undone.`}
              confirmLabel="Delete article"
              pending={isDeleting}
              onClose={() => {
                if (!isDeleting) setConfirmOpen(false);
              }}
              onConfirm={() => deleteFormRef.current?.requestSubmit()}
            />
          </form>
        </div>
        {deleteState.message && !deleteState.ok ? (
          <p className="mt-2 text-xs text-destructive">{deleteState.message}</p>
        ) : null}
      </div>
    </div>
  );
}
