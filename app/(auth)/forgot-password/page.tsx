import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Fight Zone account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6 sm:p-8">
        <ForgotPasswordForm />
      </div>

      <Link
        href="/sign-in"
        className="mx-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}
