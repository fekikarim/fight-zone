export interface SupabaseEnv {
  url: string;
  key: string;
}

/**
 * Reads and validates the Supabase environment variables.
 * Narrowing happens in local scope here so callers receive plain `string`s
 * (TypeScript drops control-flow narrowing of captured module consts during
 * generic argument inference, which breaks typed Supabase clients).
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }

  return { url, key };
}

/**
 * Returns the canonical public site URL used for auth email redirects.
 * Configured via NEXT_PUBLIC_SITE_URL (no trailing slash). Never derived
 * from request headers: trusting the `Origin`/`Host` header would let an
 * attacker craft a password-reset link that points at their own host.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production"
    ? "https://fightzone.example"
    : "http://localhost:3000";
}
