"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert, useActionForm } from "@/components/ui/form-feedback";
import { NewsFormFields } from "@/components/content/news-form-fields";
import { createNews, type ContentActionState } from "@/lib/actions/content";
import { createNewsSchema, readNewsForm } from "@/lib/validations/content";
import { issuesToFieldErrors } from "@/lib/validations/form-errors";

function validate(formData: FormData) {
  if (formData.get("cover_image_url__uploading") === "1") {
    return { cover_image_url: "Please wait for the image to finish uploading." };
  }
  const input = readNewsForm(formData);
  const parsed = createNewsSchema.safeParse({ ...input, is_published: input.is_published === true });
  return parsed.success ? null : issuesToFieldErrors(parsed.error.issues);
}

export function NewsCreateForm() {
  const router = useRouter();
  const { state, isPending, fieldErrors, formProps } = useActionForm<ContentActionState>(
    createNews,
    { ok: false },
    {
      validate,
      successToast: (result) =>
        result.message === "Article created." ? "Article created" : (result.message ?? "Article created"),
      onSuccess: () => router.push("/admin/news"),
    },
  );
  const created = state.ok;

  return (
    <form {...formProps} className="space-y-6" aria-busy={isPending}>
      <FormAlert tone="error" message={!state.ok ? state.message : undefined} />

      <NewsFormFields errors={fieldErrors} disabled={isPending || created} />

      <div className="flex flex-col-reverse gap-3 border-t border-ink-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={isPending || created} className="gap-2 sm:min-w-44">
          {isPending || created ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isPending ? "Creating article…" : created ? "Redirecting…" : "Create article"}
        </Button>
      </div>
    </form>
  );
}
