"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FieldError,
  FormAlert,
  fieldA11y,
  fieldClass,
  runActionWithToast,
  useActionForm,
  type FieldErrors,
} from "@/components/ui/form-feedback";
import {
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from "@/lib/actions/content";
import { achievementTypeLabel } from "@/lib/types/content";
import type { ContentActionState } from "@/lib/actions/content";
import type { AdminAchievementItem } from "@/lib/types/content";
import { createAchievementSchema } from "@/lib/validations/content";
import { issuesToFieldErrors } from "@/lib/validations/form-errors";
import { formatDate } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";

// Must match the `achievement_type` enum (see lib/validations/content.ts).
const ACHIEVEMENT_TYPES = ["TITLE", "TROPHY", "MEDAL", "CERTIFICATE", "RANKING"] as const;

function validate(formData: FormData) {
  const parsed = createAchievementSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    date: formData.get("date") || undefined,
    image_url: formData.get("image_url") || undefined,
  });
  return parsed.success ? null : issuesToFieldErrors(parsed.error.issues);
}

// ---------------------------------------------------------------------------
// Shared fields (create + edit)
// ---------------------------------------------------------------------------

function AchievementFields({ errors, item }: { errors: FieldErrors; item?: AdminAchievementItem }) {
  // Unique ids so several edit forms can be open next to the create form.
  const idp = item ? `a-${item.id.slice(0, 8)}-` : "";
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idp}title`} className="text-sm font-medium">
          Title <span className="text-primary">*</span>
        </label>
        <input
          id={`${idp}title`}
          name="title"
          maxLength={200}
          defaultValue={item?.title}
          className={fieldClass(!!errors.title)}
          placeholder="e.g. Tunisian Kickboxing Champion 2025"
          {...fieldA11y("title", errors.title)}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${idp}type`} className="text-sm font-medium">
          Type <span className="text-primary">*</span>
        </label>
        <Select id={`${idp}type`} name="type" defaultValue={item?.type ?? "TITLE"} className={fieldClass(!!errors.type)} {...fieldA11y("type", errors.type)}>
          {ACHIEVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {achievementTypeLabel[t]}
            </option>
          ))}
        </Select>
        <FieldError id="type-error" message={errors.type} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${idp}date`} className="text-sm font-medium">
          Date
        </label>
        <DateInput id={`${idp}date`} name="date" defaultValue={item?.date ?? ""} className={fieldClass(!!errors.date)} {...fieldA11y("date", errors.date)} />
        <FieldError id="date-error" message={errors.date} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idp}description`} className="text-sm font-medium">
          Description
        </label>
        <textarea
          id={`${idp}description`}
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={item?.description ?? ""}
          className={fieldClass(!!errors.description, "resize-y")}
          placeholder="Where and when it happened, weight class, opponent…"
          {...fieldA11y("description", errors.description)}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idp}image_url`} className="text-sm font-medium">
          Image URL
        </label>
        <input
          id={`${idp}image_url`}
          name="image_url"
          type="url"
          inputMode="url"
          defaultValue={item?.image_url ?? ""}
          className={fieldClass(!!errors.image_url)}
          placeholder="https://… (optional photo of the medal or certificate)"
          {...fieldA11y("image_url", errors.image_url)}
        />
        <FieldError id="image_url-error" message={errors.image_url} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

export function AchievementCreateForm() {
  const router = useRouter();
  const { state, isPending, fieldErrors, formProps } = useActionForm<ContentActionState>(
    createAchievement,
    { ok: false },
    {
      validate,
      successToast: "Achievement added",
      onSuccess: () => {
        formProps.ref.current?.reset();
        router.refresh();
      },
    },
  );
  const err = fieldErrors;

  return (
    <form
      {...formProps}
      className="space-y-5 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6"
      aria-busy={isPending}
    >
      <FormAlert tone="error" message={!state.ok && !Object.values(err).some(Boolean) ? state.message : undefined} />

      <AchievementFields errors={err} />

      <div className="flex justify-end border-t border-ink-border pt-5">
        <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2 sm:w-auto sm:min-w-44">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {isPending ? "Adding…" : "Add achievement"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Manager (list with inline actions)
// ---------------------------------------------------------------------------

export function AchievementManager({ items }: { items: AdminAchievementItem[] }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-12 text-center">
        <Trophy className="h-9 w-9 text-primary" aria-hidden />
        <p className="text-sm text-muted">No achievements yet — add your first one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AchievementRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function AchievementRow({ item }: { item: AdminAchievementItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const remove = () =>
    startDelete(async () => {
      const fd = new FormData();
      fd.set("achievementId", item.id);
      const result = await runActionWithToast(() => deleteAchievement({ ok: false }, fd), {
        success: "Achievement deleted",
      });
      setConfirmOpen(false);
      if (result.ok) router.refresh();
    });

  return (
    <div className="rounded-xl border border-ink-border bg-ink-soft/30">
      <div className="flex items-start gap-3 p-3 sm:items-center sm:gap-4 sm:p-4">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover sm:h-14 sm:w-14" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-soft sm:h-14 sm:w-14">
            <Trophy className="h-5 w-5 text-primary" aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium sm:truncate">{item.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded bg-ink-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {achievementTypeLabel[item.type] ?? item.type}
            </span>
            {item.date ? <span>{formatDate(item.date, { year: "numeric", month: "short", day: "numeric" })}</span> : null}
          </div>
          {item.description ? <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p> : null}
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            className={`h-10 w-10 p-0 hover:text-foreground ${editing ? "text-foreground" : "text-muted"}`}
            aria-label={editing ? "Close editor" : `Edit ${item.title}`}
            aria-expanded={editing}
            title="Edit"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
            className="h-10 w-10 p-0 text-primary hover:text-primary"
            aria-label={`Delete ${item.title}`}
            title="Delete"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
      </div>

      {editing ? <AchievementEditForm item={item} onDone={() => setEditing(false)} /> : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this achievement?"
        description={`"${item.title}" will be removed from your palmares. This cannot be undone.`}
        confirmLabel="Delete achievement"
        pending={isDeleting}
        onClose={() => {
          if (!isDeleting) setConfirmOpen(false);
        }}
        onConfirm={remove}
      />
    </div>
  );
}

function AchievementEditForm({ item, onDone }: { item: AdminAchievementItem; onDone: () => void }) {
  const router = useRouter();
  const { state, isPending, fieldErrors, formProps } = useActionForm<ContentActionState>(
    updateAchievement,
    { ok: false },
    {
      validate,
      successToast: "Changes saved",
      onSuccess: () => {
        onDone();
        router.refresh();
      },
    },
  );

  return (
    <form {...formProps} className="space-y-5 border-t border-ink-border p-3 sm:p-4" aria-busy={isPending}>
      <input type="hidden" name="achievementId" value={item.id} />
      <FormAlert
        tone="error"
        message={!state.ok && !Object.values(fieldErrors).some(Boolean) ? state.message : undefined}
      />
      <AchievementFields errors={fieldErrors} item={item} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2 sm:min-w-36">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
