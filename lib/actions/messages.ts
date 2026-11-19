"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireRole } from "@/lib/auth/guards";
import {
  loadNewerMessagesSchema,
  loadOlderMessagesSchema,
  markConversationReadSchema,
  openConversationSchema,
  sendMessageSchema,
} from "@/lib/validations/messages";
import { issuesToFieldErrors } from "@/lib/validations/form-errors";
import { logError } from "@/lib/errors";
import type { ConversationMessage } from "@/lib/types/messaging";

export interface MessageActionState {
  ok: boolean;
  errors?: Record<string, string | undefined>;
  message?: string;
  created?: ConversationMessage;
}

const MESSAGE_COLUMNS =
  "id, sender_id, body, status, created_at, kind, read_at, attachment_path, attachment_name, attachment_mime, attachment_size";

function revalidateMessaging() {
  revalidatePath("/member", "layout");
  revalidatePath("/admin", "layout");
}

/**
 * Sends a USER message (optionally with a private attachment already uploaded
 * to <member_id>/messages/<conversation_id>/…). Sender = session user; the
 * INSERT policy enforces participant, kind=USER and the attachment folder.
 */
export async function sendMessage(_prev: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const parsed = sendMessageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body") ?? "",
    attachmentPath: formData.get("attachmentPath") || undefined,
    attachmentName: formData.get("attachmentName") || undefined,
    attachmentMime: formData.get("attachmentMime") || undefined,
    attachmentSize: formData.get("attachmentSize") || undefined,
  });
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error.issues), message: parsed.error.issues[0]?.message };

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const d = parsed.data;
  const supabase = await createClient();

  if (d.attachmentPath) {
    // The object must exist in the private bucket (uploaded by this user).
    const folder = d.attachmentPath.split("/").slice(0, -1).join("/");
    const name = d.attachmentPath.split("/").pop() ?? "";
    const { data: listed } = await supabase.storage.from("fightzone-private").list(folder, { search: name, limit: 1 });
    if (!listed?.some((o) => o.name === name)) {
      return { ok: false, message: "The attachment upload didn't finish. Please attach it again." };
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: d.conversationId,
      sender_id: user.id,
      body: d.body || (d.attachmentMime === "application/pdf" ? "📎 Document" : "📷 Photo"),
      attachment_path: d.attachmentPath ?? null,
      attachment_name: d.attachmentName ?? null,
      attachment_mime: d.attachmentMime ?? null,
      attachment_size: d.attachmentSize ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .maybeSingle();

  if (error) {
    logError("Failed to send message", error, { conversationId: d.conversationId });
    if (error.code === "42501") return { ok: false, message: "This conversation is not available to you." };
    return { ok: false, message: "We could not send your message. Please try again." };
  }
  revalidateMessaging();
  return { ok: true, created: (data as ConversationMessage | null) ?? undefined };
}

/** Seif opens (or resumes) the conversation with a member. */
export async function openConversationWithMember(_prev: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const parsed = openConversationSchema.safeParse({ memberId: formData.get("memberId") });
  if (!parsed.success) return { ok: false, message: "Choose a member." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_conversation", { p_member_id: parsed.data.memberId });
  if (error || !data) {
    logError("Failed to open conversation", error);
    return { ok: false, message: "We could not open that conversation." };
  }
  redirect(`/admin/messages/${data}`);
}

export async function markConversationRead(conversationId: string): Promise<{ ok: boolean }> {
  const parsed = markConversationReadSchema.safeParse({ conversationId });
  if (!parsed.success) return { ok: false };
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: parsed.data.conversationId });
  if (error) {
    logError("Failed to mark conversation read", error, { conversationId });
    return { ok: false };
  }
  revalidateMessaging();
  return { ok: true };
}

export async function loadOlderMessages(conversationId: string, beforeId: string, limit = 30): Promise<{ messages: ConversationMessage[] }> {
  const parsed = loadOlderMessagesSchema.safeParse({ conversationId, beforeId, limit });
  if (!parsed.success) return { messages: [] };
  const user = await getCurrentUser();
  if (!user) return { messages: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_conversation_messages_v1", {
    p_conversation_id: parsed.data.conversationId,
    p_before_id: parsed.data.beforeId,
    p_limit: parsed.data.limit,
  });
  if (error) {
    logError("Failed to load older messages", error, { conversationId });
    return { messages: [] };
  }
  return { messages: (data ?? []) as ConversationMessage[] };
}

/** Messages newer than `since` (realtime hint / polling fallback). RLS-scoped. */
export async function loadNewerMessages(conversationId: string, since: string): Promise<{ messages: ConversationMessage[] }> {
  const parsed = loadNewerMessagesSchema.safeParse({ conversationId, since });
  if (!parsed.success) return { messages: [] };
  const user = await getCurrentUser();
  if (!user) return { messages: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", parsed.data.conversationId)
    .gte("created_at", parsed.data.since)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    logError("Failed to load newer messages", error, { conversationId });
    return { messages: [] };
  }
  return { messages: (data ?? []) as ConversationMessage[] };
}
