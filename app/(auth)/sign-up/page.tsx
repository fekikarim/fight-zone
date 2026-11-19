import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { SignUpForm } from "./sign-up-form";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Join the gym",
  description: "Create your Fight Zone account and start training.",
};

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext, "");
  const user = await getCurrentUser();
  if (user) redirect(next || "/member");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Join the gym
        </h1>
        <p className="text-sm text-muted">
          Create your account to book sessions and stay in the loop.
        </p>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-soft/60 p-6 sm:p-8">
        <SignUpForm next={next || undefined} />
      </div>

      <p className="text-center text-sm text-muted">
        Already a member?{" "}
        <Link
          href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
          className="font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
