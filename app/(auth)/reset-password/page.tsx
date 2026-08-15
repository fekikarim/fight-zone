import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Fight Zone account.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { code } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted">
          Choose a strong password for your account.
        </p>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6 sm:p-8">
        <ResetPasswordForm code={typeof code === "string" ? code : undefined} />
      </div>
    </div>
  );
}
