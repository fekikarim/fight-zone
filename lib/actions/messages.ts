"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  loadOlderMessagesSchema,
  markConversationReadSchema,
  sendMessageSchema,
  startConversationSchema,
} from "@/lib/validations/messages";
import { logError } from "@/lib/errors";
import type { ConversationMessage } from "@/lib/types/messaging";

export interface MessageActionState {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
  /** The inserted message on a successful send, so the thread can render it instantly. */
  created?: ConversationMessage;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const MESSAGE_PATHS = ["/member", "/admin"] as const;

function revalidateMessaging() {
  for (const path of MESSAGE_PATHS) revalidatePath(path, "layout");
  revalidatePath("/member/messages");
  revalidatePath("/admin/messages");
}

/**
 * Sends a message in an existing conversation.
 *
 * Authorization (all layers):
 *   1. UI — the composer is only rendered on a conversation the user loaded.
 *   2. Server action — the sender is always derived from the session; the
 *      conversation is loaded through participant-only RLS.
 *   3. Database — the messages INSERT policy requires the sender to be a
 *      participant and `sender_id = auth.uid()`; the trigger notifies the
 *      other participant only.
 *
 * Returns the created row so the client thread can render the reply without
 * a full reload.
 */
export async function sendMessage(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const parsed = sendMessageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      body: parsed.data.body,
    })
    .select("id, sender_id, body, status, created_at")
    .maybeSingle();

  if (error) {
    logError("Failed to send message", error, {
      conversationId: parsed.data.conversationId,
    });
    if (error.code === "42501") {
      return { ok: false, message: "This conversation is not available to you." };
    }
    if (error.code === "23503") {
      return { ok: false, message: "This conversation could not be found." };
    }
    return { ok: false, message: "We could not send your message. Please try again." };
  }

  revalidateMessaging();
  return { ok: true, created: data ?? undefined };
}

/**
 * Opens (or resumes) a conversation with an authorized recipient — a coach a
 * member has booked with, or a member who has booked with the coach.
 *
 * Authorization (all layers):
 *   1. UI — the recipient picker only lists authorized recipients.
 *   2. Server action — the acting side (member vs coach) is derived from the
 *      session roles; the recipient id is never trusted for ownership.
 *   3. Database — the conversations INSERT policy requires the actor to be a
 *      participant and a bookings relationship to exist between the pair.
 *
 * Concurrency: `upsert` with ignoreDuplicates is atomic — a second tap (or a
 * simultaneous request) either returns the same row or falls back to reading
 * the existing one, never creating a duplicate conversation.
 */
export async function startConversation(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const parsed = startConversationSchema.safeParse({
    recipientId: formData.get("recipientId"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const isMember = user.roles.includes("MEMBER");
  const isStaff = user.roles.includes("COACH") || user.roles.includes("ADMIN");
  if (!isMember && !isStaff) {
    return { ok: false, message: "You are not allowed to start a conversation." };
  }

  // The acting side decides which column the recipient lands in. Ownership is
  // always the session user, never the submitted id.
  const memberId = isMember ? user.id : parsed.data.recipientId;
  const coachId = isMember ? parsed.data.recipientId : user.id;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      { member_id: memberId, coach_id: coachId },
      { onConflict: "member_id,coach_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    logError("Failed to start conversation", error, { memberId, coachId });
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You can only message someone you have booked a session with.",
      };
    }
    return { ok: false, message: "We could not start the conversation. Please try again." };
  }

  let conversationId = data?.id ?? null;
  if (!conversationId) {
    // The upsert hit the unique constraint and inserted nothing — read back
    // the pre-existing conversation so we can resume it instead of failing.
    const { data: existing, error: readError } = await supabase
      .from("conversations")
      .select("id")
      .eq("member_id", memberId)
      .eq("coach_id", coachId)
      .maybeSingle();
    if (readError) {
      logError("Failed to read existing conversation", readError, { memberId, coachId });
      return { ok: false, message: "We could not start the conversation. Please try again." };
    }
    if (!existing) {
      return { ok: false, message: "We could not start the conversation. Please try again." };
    }
    conversationId = existing.id;
  }

  revalidateMessaging();
  redirect(isMember ? `/member/messages/${conversationId}` : `/admin/messages/${conversationId}`);
}

/**
 * Marks every message from the other participant as READ. Idempotent; the
 * RPC only touches rows where `sender_id <> auth.uid() AND status = 'UNREAD'`.
 * Runs on the thread opening — failures are silent so reading is never blocked.
 */
export async function markConversationRead(conversationId: string): Promise<{ ok: boolean }> {
  const parsed = markConversationReadSchema.safeParse({ conversationId });
  if (!parsed.success) return { ok: false };

  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: parsed.data.conversationId,
  });
  if (error) {
    logError("Failed to mark conversation read", error, { conversationId });
    return { ok: false };
  }

  revalidatePath("/member", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Fetches an older page of messages (keyset pagination) for the thread's
 * "Load older" control. Participant-only RLS is enforced by the RPC, which
 * raises 42501 for anyone outside the conversation.
 */
export async function loadOlderMessages(
  conversationId: string,
  beforeId: string,
  limit = 50,
): Promise<{ messages: ConversationMessage[] }> {
  const parsed = loadOlderMessagesSchema.safeParse({ conversationId, beforeId, limit });
  if (!parsed.success) return { messages: [] };

  const user = await getCurrentUser();
  if (!user) return { messages: [] };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_conversation_messages", {
    p_conversation_id: parsed.data.conversationId,
    p_before_id: parsed.data.beforeId,
    p_limit: parsed.data.limit,
  });
  if (error) {
    logError("Failed to load older messages", error, {
      conversationId: parsed.data.conversationId,
    });
    return { messages: [] };
  }
  return { messages: data ?? [] };
}
