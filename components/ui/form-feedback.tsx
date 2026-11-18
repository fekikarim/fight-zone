"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import type { FieldErrors } from "@/lib/validations/form-errors";

export type { FieldErrors };

/** Minimum shape every action state handled by `useActionForm` exposes. */
export interface ActionFormState {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
}

/** Inline error under a field; `id` is wired to the input's aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-400">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** Form-level banner (server errors, success confirmation). */
export function FormAlert({ tone, message }: { tone: "error" | "success"; message?: string }) {
  if (!message) return null;
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

/** Shared input styling with an invalid state. */
export function fieldClass(invalid?: boolean, extra?: string) {
  return cn(
    "w-full rounded-lg border bg-ink-soft/40 px-3 py-2.5 text-base text-foreground placeholder:text-zinc-500 transition-colors sm:text-sm",
    "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-red-500/70" : "border-ink-border",
    extra,
  );
}

/** a11y props for an input bound to a field error. */
export function fieldA11y(name: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${name}-error` : undefined,
  } as const;
}

/** Message for an unexpected failure (network drop, server crash). */
export function friendlyErrorMessage() {
  return typeof navigator !== "undefined" && navigator.onLine === false
    ? "You appear to be offline. Check your connection and try again."
    : "Something went wrong. Please try again.";
}

/** True for Next.js control-flow errors (redirect/notFound) that must propagate. */
export function isNextNavigationError(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/**
 * Runs a server action from a click/form handler with toasts:
 * success → green toast, failure → red toast. Never throws (except
 * Next.js navigation), so a failed action can't crash the page.
 */
export async function runActionWithToast<S extends { ok: boolean; message?: string }>(
  run: () => Promise<S>,
  { success, error }: { success?: string | ((s: S) => string | undefined); error?: string } = {},
): Promise<S> {
  try {
    const result = await run();
    if (result.ok) {
      const message = typeof success === "function" ? success(result) : (success ?? result.message);
      if (message) toast.success(message);
    } else {
      toast.error(result.message ?? error ?? "Could not complete the action. Please try again.");
    }
    return result;
  } catch (err) {
    if (isNextNavigationError(err)) throw err;
    const message = friendlyErrorMessage();
    toast.error(message);
    return { ok: false, message } as S;
  }
}

interface UseActionFormOptions<S extends ActionFormState> {
  /** Client-side validation; return field errors to block submission. */
  validate?: (formData: FormData) => FieldErrors | null;
  /** Runs after the action resolves with ok: true. */
  onSuccess?: (state: S) => void;
  /**
   * Toast shown on success (string, or built from the result). The toast
   * lives in the root layout, so it survives a redirect to another page.
   */
  successToast?: string | ((state: S) => string);
}

/**
 * Wraps `useActionState` for forms that must NOT lose their values.
 *
 * React 19 resets uncontrolled fields after every `<form action>` submit —
 * even when the server rejected it — so users had to retype everything.
 * This submits through `onSubmit` instead (no reset), runs client-side
 * validation first, merges server field errors, and focuses the first
 * invalid field. Unexpected failures (network, server crash) become a
 * friendly form error instead of an error page.
 */
export function useActionForm<S extends ActionFormState>(
  action: (prev: S, formData: FormData) => Promise<S>,
  initialState: S,
  options: UseActionFormOptions<S> = {},
) {
  const { validate, onSuccess, successToast } = options;
  const onSuccessRef = useRef(onSuccess);
  const successToastRef = useRef(successToast);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    successToastRef.current = successToast;
  });

  const [state, formAction, isPending] = useActionState<S, FormData>(async (prev: S, formData: FormData) => {
    try {
      const result = await action(prev, formData);
      if (result.ok) {
        const message = successToastRef.current;
        if (message) toast.success(typeof message === "function" ? message(result) : message);
        onSuccessRef.current?.(result);
      } else if (result.message) {
        // The inline banner sits at the top of the form, often off-screen
        // on mobile: the toast makes sure the failure is always seen.
        toast.error(result.message);
      }
      return result;
    } catch (error) {
      // Next.js navigation (redirect/notFound) must keep propagating.
      if (isNextNavigationError(error)) throw error;
      const message = friendlyErrorMessage();
      toast.error(message);
      return { ...prev, ok: false, fieldErrors: undefined, message } as S;
    }
  }, initialState as Awaited<S>);

  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Server field errors win until the user edits that field again.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setDismissed(new Set());
  }
  const serverErrors = state.fieldErrors ?? {};
  const fieldErrors: FieldErrors = { ...serverErrors, ...clientErrors };
  for (const key of dismissed) {
    if (!clientErrors[key]) delete fieldErrors[key];
  }

  const focusFirstInvalid = useCallback((errors: FieldErrors) => {
    const form = formRef.current;
    const first = Object.keys(errors).find((k) => errors[k]);
    if (!form || !first) return;
    const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]:not([type="hidden"])`) ??
      form.querySelector<HTMLElement>(`#${CSS.escape(first)}`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    if (state.fieldErrors && Object.values(state.fieldErrors).some(Boolean)) {
      focusFirstInvalid(state.fieldErrors);
    }
  }, [state, focusFirstInvalid]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isPending) return;
      const formData = new FormData(event.currentTarget);
      const errors = validate?.(formData) ?? null;
      if (errors && Object.values(errors).some(Boolean)) {
        setClientErrors(errors);
        focusFirstInvalid(errors);
        return;
      }
      setClientErrors({});
      startTransition(() => formAction(formData));
    },
    [formAction, focusFirstInvalid, isPending, validate],
  );

  /** Clears a field's error as soon as the user edits it. */
  const clearError = useCallback((name: string) => {
    setClientErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    setDismissed((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
  }, []);

  /** Spread on <form>: clears the edited field's error on input/change. */
  const formProps = {
    ref: formRef,
    onSubmit,
    noValidate: true,
    onInput: (e: FormEvent<HTMLFormElement>) => {
      const name = (e.target as HTMLInputElement).name;
      if (name) clearError(name);
    },
    onChange: (e: FormEvent<HTMLFormElement>) => {
      const name = (e.target as HTMLInputElement).name;
      if (name) clearError(name);
    },
  };

  return { state, isPending, fieldErrors, formProps, clearError };
}
