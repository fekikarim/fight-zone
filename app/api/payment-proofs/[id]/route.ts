import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

/**
 * Authorized, short-lived access to a private payment proof.
 * RLS on payment_submissions (owner or staff) decides whether the row is
 * visible; the signed URL is created with the caller's own session, so
 * storage RLS applies too. The bucket is private — no public URL exists.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: sub, error } = await supabase.from("payment_submissions").select("proof_path").eq("id", id).maybeSingle();
  if (error || !sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error: signError } = await supabase.storage
    .from("fightzone-private")
    .createSignedUrl(sub.proof_path, 60);
  if (signError || !signed?.signedUrl) {
    logError("Failed to sign payment proof URL", signError, { submissionId: id });
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
