import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { SignUpForm } from "./sign-up-form";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create your Fight Zone account and start training.",
};

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext, "");
  const user = await getCurrentUser();
  if (user) redirect(next || "/member");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="type-overline flex items-center gap-2.5 text-muted">
          <span className="slant-bar h-1 w-4" aria-hidden />
          Free account
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Join Fight Zone
        </h1>
        <p className="text-sm text-muted">Create your account to register for events and talk to Coach Seif.</p>
      </div>

      <SignUpForm next={next || undefined} />

      <p className="border-t border-ink-border pt-6 text-sm text-muted">
        Already a member?{" "}
        <Link
          href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
          className="link-draw font-semibold text-foreground"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
