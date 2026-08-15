import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Fight Zone account.",
};

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/member");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted">Sign in to your Fight Zone account.</p>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6 sm:p-8">
        <SignInForm />
      </div>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Join the gym
        </Link>
      </p>
    </div>
  );
}
