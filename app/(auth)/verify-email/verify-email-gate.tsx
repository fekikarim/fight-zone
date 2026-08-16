"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, MailCheck, Send } from "lucide-react";
import {
  checkEmailVerification,
  resendVerificationEmail,
  type AuthActionState,
} from "@/lib/actions/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyEmailGateProps {
  /** Email the verification link was sent to, when safely available. */
  email?: string;
  /** Optional callback error surfaced via the URL. */
  error?: string;
  /** True when a (restricted, unverified) session exists — enables logout. */
  hasSession: boolean;
}

/**
 * Email-verification gate. All verification checks are authoritative:
 * "I've verified my email" asks Supabase Auth for the current session and
 * `email_confirmed_at`; a client-side flag can never bypass the gate.
 */
export function VerifyEmailGate({ email, error, hasSession }: VerifyEmailGateProps) {
  const [checkState, checkAction, isChecking] = useActionState(
    checkEmailVerification,
    { ok: false } as AuthActionState,
  );

  const [resendEmail, setResendEmail] = useState(email ?? "");
  const [resendState, setResendState] = useState<AuthActionState>({ ok: false });
  const [cooldown, setCooldown] = useState(0);
  const [isResending, startResend] = useTransition();

  const handleResend = () => {
    const target = resendEmail.trim();
    if (!target || isResending || cooldown > 0) return;
    setResendState({ ok: false });
    startResend(async () => {
      const result = await resendVerificationEmail(target);
      if (result.ok) setCooldown(RESEND_COOLDOWN_SECONDS);
      setResendState(result);
    });
  };

  const resendDisabled = isResending || cooldown > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Verify your email address
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Your account has been created successfully. We sent a verification
          link — click it to activate your account and start training.
        </p>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6 sm:p-8">
        <div className="flex flex-col gap-5">
          {email ? (
            <p className="text-center text-sm text-muted">
              Verification email sent to{" "}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          ) : (
            <p className="text-center text-sm text-muted">
              Didn&apos;t receive it? Check your inbox and spam/junk folder, or
              resend below.
            </p>
          )}

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}

          {checkState.message && !checkState.ok ? (
            <p
              role="alert"
              className="rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary"
            >
              {checkState.message}
            </p>
          ) : null}

          {resendState.message ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-ink-border bg-ink-soft px-3 py-2 text-sm text-muted"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{resendState.message}</span>
            </p>
          ) : null}

          <form action={checkAction} className="flex flex-col gap-3">
            <Button type="submit" size="lg" disabled={isChecking}>
              {isChecking ? (
                <>
                  <Spinner size="sm" />
                  Checking…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  I&apos;ve verified my email
                </>
              )}
            </Button>
          </form>

          <div className="flex flex-col gap-3">
            {!email ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="resend-email">Email address</Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(event) => setResendEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleResend}
              disabled={resendDisabled || (!email && !resendEmail.trim())}
            >
              {isResending ? (
                <>
                  <Spinner size="sm" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden />
                  {cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : "Resend verification email"}
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-ink-border pt-4">
            <p className="text-sm text-muted">
              Already verified?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                Sign in
              </Link>
            </p>
            {hasSession ? <SignOutButton /> : null}
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted">
        No email yet? Check your spam or junk folder, then resend above.
      </p>
    </div>
  );
}
