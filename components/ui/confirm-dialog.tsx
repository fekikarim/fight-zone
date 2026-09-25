"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Shared destructive-action confirmation dialog. Bottom sheet on mobile,
 * centered card on larger screens. Escape/backdrop close, initial focus on
 * the safe (cancel) action, focus returned to the trigger on close.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => cancelRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus?.();
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ animation: "fz-backdrop-in 0.25s ease both" }}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby="confirm-dialog-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

      <div className="relative w-full max-w-sm rounded-2xl border border-ink-border bg-ink-base p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
            <AlertTriangle className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-white">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-1 text-sm leading-relaxed text-muted">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={pending}
            onClick={onConfirm}
            className="w-full gap-2 sm:w-auto"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
