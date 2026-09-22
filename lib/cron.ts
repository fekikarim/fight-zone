import "server-only";

import { NextRequest, NextResponse } from "next/server";

/**
 * Returns true when the request carries the expected cron bearer secret.
 * The same secret must be stored in the deployment environment as
 * CRON_SECRET and passed by the Netlify scheduled functions.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  // Constant-time comparison to avoid leaking the secret via timing.
  if (token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

/** Standard 401 used for unauthorized scheduler calls. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
