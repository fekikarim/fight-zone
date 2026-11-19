"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, fieldA11y, fieldClass, useActionForm } from "@/components/ui/form-feedback";
import { createLegalDraft, publishLegal, saveLegalDraft, type SiteContentState } from "@/lib/actions/site-content";

export function CreateLegalDraftButton({ kind, template }: { kind: "privacy" | "terms"; template: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} className="gap-2" onClick={() => start(async () => {
      const r = await createLegalDraft(kind, template);
      if (!r.ok) return void toast.error(r.message ?? "Could not create the draft.");
      toast.success(r.message ?? "Draft created");
      router.refresh();
    })}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} New draft version
    </Button>
  );
}

export function LegalDraftEditor({ doc }: { doc: { id: string; version: number; title: string; content: string } }) {
  const router = useRouter();
  const { isPending, fieldErrors: e, formProps } = useActionForm<SiteContentState>(saveLegalDraft, { ok: false }, { successToast: "Draft saved", onSuccess: () => router.refresh() });
  const [confirm, setConfirm] = useState(false);
  const [publishing, start] = useTransition();
  const needsReview = /\[TO CONFIRM|DRAFT —/.test(doc.content);
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="id" value={doc.id} />
      <div className="space-y-1">
        <label htmlFor={`t-${doc.id}`} className="text-xs text-muted">Title</label>
        <input id={`t-${doc.id}`} name="title" defaultValue={doc.title} maxLength={120} className={fieldClass(!!e.title)} {...fieldA11y("title", e.title)} />
        <FieldError id="title-error" message={e.title} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`c-${doc.id}`} className="text-xs text-muted">Text — “## ” for section titles, “- ” for bullets, **bold**</label>
        <textarea id={`c-${doc.id}`} name="content" defaultValue={doc.content} rows={22} maxLength={60000} className={fieldClass(!!e.content, "resize-y font-mono text-sm")} {...fieldA11y("content", e.content)} />
        <FieldError id="content-error" message={e.content} />
      </div>
      {needsReview ? <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">This draft still contains “[TO CONFIRM]” markers or the draft notice. Complete and have it reviewed before publishing.</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline" disabled={isPending} className="gap-2">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save draft</Button>
        <Button type="button" disabled={publishing} onClick={() => setConfirm(true)} className="gap-2"><Upload className="h-4 w-4" /> Publish version {doc.version}</Button>
      </div>
      <ConfirmDialog open={confirm} title={`Publish version ${doc.version}?`} pending={publishing} confirmLabel="Publish"
        description={needsReview ? "It still contains draft markers. Visitors will see exactly this text. The current version stays in history." : "Visitors will see this version. The current one stays in history."}
        onClose={() => !publishing && setConfirm(false)}
        onConfirm={() => start(async () => {
          const r = await publishLegal(doc.id);
          setConfirm(false);
          if (!r.ok) return void toast.error(r.message ?? "Could not publish.");
          toast.success(r.message ?? "Published");
          router.refresh();
        })} />
    </form>
  );
}
