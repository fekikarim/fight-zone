import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/types/database.types";

/**
 * Refreshes the Supabase auth session on every matching request.
 * Next.js 16 renamed the `middleware` convention to `proxy`; this helper is
 * the equivalent of the official Supabase `middleware.ts` setup.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseEnv();

  // Start with a response we can modify so cookie refreshes are forwarded.
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validate/refresh the session (does not throw for missing sessions).
  await supabase.auth.getUser();

  return supabaseResponse;
}
