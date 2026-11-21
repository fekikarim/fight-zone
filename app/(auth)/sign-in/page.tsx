import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { SignInForm } from "./sign-in-form";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Fight Zone account.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext, "");
  const user = await getCurrentUser();
  if (user) redirect(next || (user.roles.some((r) => r === "ADMIN" || r === "COACH") ? "/admin" : "/member"));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="type-overline flex items-center gap-2.5 text-muted">
          <span className="slant-bar h-1 w-4" aria-hidden />
          Members
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Welcome back
        </h1>
        <p className="text-sm text-muted">Sign in to see your events, payments and messages.</p>
      </div>

      <SignInForm next={next || undefined} />

      <p className="border-t border-ink-border pt-6 text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
          className="link-draw font-semibold text-foreground"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
