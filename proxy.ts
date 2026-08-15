import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (renamed from `middleware`).
 * Keeps the Supabase auth session fresh via cookie-based SSR.
 * Runs before routes render; scoped to page routes only (not static assets).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all request paths except static assets, images and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|mov)$).*)",
  ],
};
