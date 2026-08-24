import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Operational health probe for deployment/rollback verification.
 * Returns 200 only when the app can reach the database. Exposes no
 * internals beyond coarse status — safe to expose publicly.
 */
export async function GET() {
  const startedAt = Date.now();
  let db = "down";
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("roles").select("id", { count: "exact", head: true });
    db = error ? "down" : "up";
  } catch {
    db = "down";
  }
  const ok = db === "up";
  return NextResponse.json(
    { ok, db, latencyMs: Date.now() - startedAt, ts: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
