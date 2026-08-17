import type { Database } from "@/types/database.types";

/**
 * Shared messaging shapes. Pure types only (no runtime imports), safe to
 * import from server queries, server actions, and client components alike.
 * Field names mirror the RPC result columns from
 * supabase/migrations/20260819000000_messaging.sql.
 */

/** The DB CHECK on messages.status restricts this enum to UNREAD/READ. */
export type MessageStatus = Database["public"]["Enums"]["message_status"];

export interface ConversationMessage {
  id: string;
  sender_id: string;
  body: string;
  status: MessageStatus;
  created_at: string;
}

export interface ConversationSummary {
  conversation_id: string;
  other_participant_id: string;
  other_full_name: string | null;
  other_avatar_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
}

/** An actor the current user may message (booked member or coach). */
export interface MessagingRecipient {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  /** Role of the recipient: "coach" when the actor is a member, "member" otherwise. */
  role: "coach" | "member";
}
