/**
 * Pure preview-mode helpers (no server-only dependencies — safe for
 * client components, server actions, and headless tests alike).
 */

/** Cookie marking an active staff "View as Member" preview session. */
export const PREVIEW_COOKIE = "fz_preview_member";

/** Cookie value carrying no privileges — authorization always comes from roles. */
export const PREVIEW_COOKIE_VALUE = "member";

const ALLOWED_RETURNS = ["/events", "/news"] as const;
export type PreviewReturn = (typeof ALLOWED_RETURNS)[number];

/**
 * Allowlist for post-enter redirects. Anything else falls back to /events,
 * so the cookie setter can never become an open redirect.
 */
export function parsePreviewReturnTo(raw: unknown): PreviewReturn {
  return (ALLOWED_RETURNS as readonly string[]).includes(
    typeof raw === "string" ? raw : "",
  )
    ? (raw as PreviewReturn)
    : "/events";
}
