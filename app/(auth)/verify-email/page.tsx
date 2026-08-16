import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { VerifyEmailGate } from "./verify-email-gate";

export const metadata: Metadata = {
  title: "Verify your email",
  description:
    "Confirm your email address to activate your Fight Zone account.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string; error?: string }>;
}

/**
 * Dedicated email-verification gate. Publicly reachable: users arriving here
 * without a session (typical — confirmation is required before any session is
 * issued) see the "check your email" state. Users who are already verified are
 * redirected straight into the app. In the rare restricted state where a
 * session exists but the email is not yet confirmed, the gate stays visible
 * and logout remains available.
 */
export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { email, error } = await searchParams;

  const user = await getCurrentUser();
  if (user?.emailConfirmedAt) redirect("/member");

  const safeEmail =
    typeof email === "string" && email.length <= 254 ? email : undefined;
  const safeError =
    typeof error === "string" && error.length <= 200 ? error : undefined;

  return (
    <VerifyEmailGate
      email={safeEmail}
      error={safeError}
      hasSession={Boolean(user)}
    />
  );
}
