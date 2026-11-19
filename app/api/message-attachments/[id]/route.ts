import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

/**
 * Authorized, short-lived access to a private message attachment. The
 * message row is only visible to conversation participants (RLS); the
 * signed URL is minted with the caller's session (storage RLS applies).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: msg } = await supabase.from("messages").select("attachment_path").eq("id", id).maybeSingle();
  if (!msg?.attachment_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error } = await supabase.storage.from("fightzone-private").createSignedUrl(msg.attachment_path, 120);
  if (error || !signed?.signedUrl) {
    logError("Failed to sign message attachment", error, { messageId: id });
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
