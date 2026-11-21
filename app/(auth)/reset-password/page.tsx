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
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Set a new password
        </h1>
        <p className="text-sm text-muted">
          Choose a strong password for your account.
        </p>
      </div>

      <div>
        <ResetPasswordForm code={typeof code === "string" ? code : undefined} />
      </div>
    </div>
  );
}
