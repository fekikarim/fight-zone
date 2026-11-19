import type { Database } from "@/types/database.types";

/**
 * Shared messaging shapes (V1 single-coach model). Pure types only.
 * Columns mirror `get_conversation_messages_v1` / `get_inbox`
 * (supabase/migrations/20261118000200_v1_messaging.sql).
 */

export type MessageStatus = Database["public"]["Enums"]["message_status"];

export interface ConversationMessage {
  id: string;
  sender_id: string;
  body: string;
  status: MessageStatus;
  created_at: string;
  /** USER = typed by a person; SYSTEM = automated Fight Zone notice. */
  kind: "USER" | "SYSTEM";
  read_at: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

export interface InboxItem {
  conversation_id: string;
  member_id: string;
  member_name: string | null;
  member_email: string | null;
  member_avatar: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  last_kind: string | null;
  unread_count: number;
}

export const ATTACHMENT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
