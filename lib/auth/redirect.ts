/**
 * Validates a post-auth return path: same-origin, absolute path only
 * (no scheme, no protocol-relative "//", no backslashes). Falls back to
 * the role's home.
 */
export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next.length > 300) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  if (/^\/(sign-in|sign-up|sign-out|auth)\b/.test(next)) return fallback;
  return next;
}
