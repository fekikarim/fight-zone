"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  pending?: boolean;
  /** Destructive styling for the submit button. */
  danger?: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  children: ReactNode;
}

/**
 * Small modal form (reason, amount…). Bottom sheet on phones, centered on
 * larger screens; Escape/backdrop close; focus moves to the first field and
 * returns to the trigger.
 */
export function FormDialog({ open, title, description, submitLabel, pending = false, danger = false, onClose, onSubmit, children }: FormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus();
    }, 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus?.();
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pending) onSubmit(new FormData(e.currentTarget));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden />
      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-ink-border bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight">{title}</h2>
            {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close"
            className="-mr-1 rounded-md p-1.5 text-muted hover:bg-ink-soft hover:text-foreground">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={pending}
            className={`w-full gap-2 sm:w-auto ${danger ? "bg-red-600 hover:bg-red-700" : ""}`}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
