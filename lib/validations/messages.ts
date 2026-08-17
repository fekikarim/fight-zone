import { z } from "zod";

/**
 * Messaging validation schemas. Server actions are the only trust boundary:
 * every field is trimmed, sized, and typed before it reaches the database.
 * The database re-checks length/bounds and relationship rules authoritatively
 * (see supabase/migrations/20260819000000_messaging.sql).
 */

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Please choose a valid conversation."),
  body: z
    .string()
    .trim()
    .min(1, "Your message is empty.")
    .max(4000, "Messages can be up to 4000 characters."),
});

/** Recipient is role-dependent: a coach id for members, a member id for coaches. */
export const startConversationSchema = z.object({
  recipientId: z.string().uuid("Please choose a valid recipient."),
});

export const loadOlderMessagesSchema = z.object({
  conversationId: z.string().uuid("Please choose a valid conversation."),
  beforeId: z.string().uuid("Please choose a valid cursor."),
  limit: z.number().int().min(1).max(100).default(50),
});

export const markConversationReadSchema = z.object({
  conversationId: z.string().uuid("Please choose a valid conversation."),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type LoadOlderMessagesInput = z.infer<typeof loadOlderMessagesSchema>;
export type MarkConversationReadInput = z.infer<typeof markConversationReadSchema>;
