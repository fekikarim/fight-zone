"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Supabase auth callback (email confirmation / recovery links).
 *
 * The confirmation link redirects here with either a PKCE `code` (query
 * string) or an implicit-grant session (URL fragment). Tokens are exchanged
 * with the authoritative auth server by the browser client — the same browser
 * that started the flow holds the PKCE code verifier in its cookies. The
 * `detectSessionInUrl` behaviour persists the resulting session to cookies via
 * @supabase/ssr, then we continue into the app.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("type") ?? "";

      if (params.get("error") || params.get("error_description")) {
        setError(
          "We couldn't complete this link. It may be invalid or already used.",
        );
        return;
      }

      try {
        const supabase = createClient();
        // Triggers the PKCE/implicit session detection + code exchange.
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          setError(
            "We couldn't verify this link. It may be invalid, expired, or already used.",
          );
          return;
        }

        const next = type === "recovery" ? "/reset-password" : "/member";
        router.replace(next);
        router.refresh();
      } catch {
        setError(
          "Something went wrong while completing this link. Please try again.",
        );
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-ink-border bg-ink-soft/60 px-6 py-12 text-center">
          <MailWarning className="h-10 w-10 text-primary" aria-hidden />
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">
            Link problem
          </h1>
          <p className="text-sm leading-relaxed text-muted">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/verify-email">Resend verification email</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-muted">Completing your sign-in…</p>
      </div>
    </div>
  );
}
