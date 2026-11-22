"use client";

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Check, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Error message from the form (shown under the field). */
  error?: string;
  /** Show a green check (field is filled and valid). */
  valid?: boolean;
  /** Right-aligned helper next to the label (e.g. "Forgot password?"). */
  aside?: ReactNode;
  /** Adds the show/hide toggle. */
  password?: boolean;
  hint?: ReactNode;
}

/**
 * Auth input: leading icon, 52px touch target, 16px text (no iOS zoom),
 * live valid / error state and an accessible message below.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, icon: Icon, error, valid, aside, password, hint, className, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-foreground/90">{label}</label>
        {aside}
      </div>
      <div className="group relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200",
            error ? "text-danger" : "text-muted-foreground group-focus-within:text-primary-readable",
          )}
          aria-hidden
        />
        <input
          ref={ref}
          id={id}
          type={password ? (show ? "text" : "password") : props.type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize={props.autoCapitalize ?? "off"}
          spellCheck={false}
          {...props}
          className={cn(
            "h-[52px] w-full rounded-2xl border bg-white/[0.04] pl-12 pr-12 text-base text-foreground placeholder:text-muted-foreground/70",
            "transition-[border-color,background-color,box-shadow] duration-200",
            "border-white/10 hover:border-white/20",
            "focus-visible:border-primary/70 focus-visible:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
            error && "border-danger/60 bg-danger-soft/40 focus-visible:border-danger focus-visible:ring-danger/15",
            className,
          )}
        />
        {password ? (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        ) : valid && !error ? (
          <span
            aria-hidden
            className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 animate-[fz-panel-in_220ms_var(--ease-out)_both] items-center justify-center rounded-full bg-success text-ink"
          >
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex animate-[fz-fade-up_200ms_var(--ease-out)_both] items-start gap-1.5 text-[13px] font-medium text-danger">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

/** 4-bar strength meter + plain advice (advisory only — the rule is 8+ chars). */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const checks = [value.length >= 8, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value) || value.length >= 12];
  const score = checks.filter(Boolean).length;
  const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < score ? colors[score] : "bg-white/10")} />
        ))}
      </div>
      <p className="flex items-center justify-between text-xs text-muted">
        <span>Password strength: <strong className="font-semibold text-foreground/90">{labels[score]}</strong></span>
        <span className="text-muted-foreground">{value.length < 8 ? `${8 - value.length} more to go` : "Meets the minimum"}</span>
      </p>
    </div>
  );
}
