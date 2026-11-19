"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, FormAlert, fieldA11y, fieldClass, useActionForm } from "@/components/ui/form-feedback";
import { deleteFaq, moveFaq, saveFaq, type SiteContentState } from "@/lib/actions/site-content";

export interface FaqItem { id: string; category: string; question: string; answer: string; is_published: boolean }

export function FaqForm({ item, categories, onDone }: { item?: FaqItem; categories: string[]; onDone?: () => void }) {
  const router = useRouter();
  const { state, isPending, fieldErrors: e, formProps } = useActionForm<SiteContentState>(saveFaq, { ok: false }, {
    successToast: (r) => r.message ?? "Saved",
    onSuccess: () => { if (!item) formProps.ref.current?.reset(); onDone?.(); router.refresh(); },
  });
  const [published, setPublished] = useState(item?.is_published ?? true);
  const idp = item ? `f-${item.id.slice(0, 6)}-` : "nf-";
  return (
    <form {...formProps} className="space-y-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <FormAlert tone="error" message={!state.ok && !Object.values(e).some(Boolean) ? state.message : undefined} />
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div className="space-y-1">
          <label htmlFor={`${idp}cat`} className="text-xs text-muted">Category</label>
          <input id={`${idp}cat`} name="category" list="faq-cats" maxLength={40} defaultValue={item?.category ?? "General"} className={fieldClass(!!e.category)} {...fieldA11y("category", e.category)} />
          <datalist id="faq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <FieldError id="category-error" message={e.category} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${idp}q`} className="text-xs text-muted">Question</label>
          <input id={`${idp}q`} name="question" maxLength={200} defaultValue={item?.question} placeholder="e.g. Do I need my own gloves?" className={fieldClass(!!e.question)} {...fieldA11y("question", e.question)} />
          <FieldError id="question-error" message={e.question} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idp}a`} className="text-xs text-muted">Answer</label>
        <textarea id={`${idp}a`} name="answer" rows={3} maxLength={3000} defaultValue={item?.answer} className={fieldClass(!!e.answer, "resize-y")} {...fieldA11y("answer", e.answer)} />
        <FieldError id="answer-error" message={e.answer} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(ev) => setPublished(ev.target.checked)} className="h-4 w-4 accent-primary" /> Published</label>
        <input type="hidden" name="is_published" value={published ? "true" : "false"} />
        <div className="flex gap-2">
          {onDone ? <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button> : null}
          <Button type="submit" disabled={isPending} className="gap-2">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{item ? "Save" : "Add question"}</Button>
        </div>
      </div>
    </form>
  );
}

export function FaqList({ items, categories }: { items: FaqItem[]; categories: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<SiteContentState>) => start(async () => {
    const r = await fn();
    if (!r.ok) toast.error(r.message ?? "That didn't work.");
    else { if (r.message) toast.success(r.message); router.refresh(); }
  });
  if (!items.length) return <p className="rounded-xl border border-dashed border-ink-border px-4 py-8 text-center text-sm text-muted">No questions yet.</p>;
  return (
    <>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={it.id} className="rounded-xl border border-ink-border bg-ink-soft/30">
            <div className="flex items-start gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{it.question}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{it.answer}</p>
                <div className="mt-1 flex gap-1.5"><Badge variant="neutral">{it.category}</Badge>{!it.is_published ? <Badge variant="outline">Hidden</Badge> : null}</div>
              </div>
              <div className="flex shrink-0">
                <Button size="sm" variant="ghost" aria-label="Move up" disabled={pending || i === 0} onClick={() => run(() => moveFaq(it.id, "up"))}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Move down" disabled={pending || i === items.length - 1} onClick={() => run(() => moveFaq(it.id, "down"))}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(editing === it.id ? null : it.id)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setDel(it.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            {editing === it.id ? <div className="border-t border-ink-border p-3"><FaqForm item={it} categories={categories} onDone={() => setEditing(null)} /></div> : null}
          </li>
        ))}
      </ol>
      <ConfirmDialog open={!!del} title="Delete this question?" description="It will be removed from the public FAQ." confirmLabel="Delete" pending={pending}
        onClose={() => setDel(null)} onConfirm={() => { const id = del!; setDel(null); run(() => deleteFaq(id)); }} />
    </>
  );
}
