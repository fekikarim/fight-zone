import { z } from "zod";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES } from "@/lib/types/messaging";

/**
 * Messaging validation. Server actions are the trust boundary; the database
 * re-checks sender, participant, kind and attachment folder (RLS).
 */

const UUID = z.guid("Please choose a valid conversation.");

export const sendMessageSchema = z
  .object({
    conversationId: UUID,
    body: z.string().trim().max(4000, "Messages can be up to 4000 characters.").default(""),
    attachmentPath: z.string().max(300).optional(),
    attachmentName: z.string().trim().max(200).optional(),
    attachmentMime: z.enum(ATTACHMENT_MIME_TYPES).optional(),
    attachmentSize: z.coerce.number().int().min(1).max(ATTACHMENT_MAX_BYTES).optional(),
  })
  .superRefine((d, ctx) => {
    if (!d.body && !d.attachmentPath) ctx.addIssue({ code: "custom", message: "Your message is empty.", path: ["body"] });
    if (d.attachmentPath && (!d.attachmentMime || !d.attachmentSize)) {
      ctx.addIssue({ code: "custom", message: "Attachment details are missing.", path: ["attachmentPath"] });
    }
  });

export const openConversationSchema = z.object({ memberId: z.guid("Choose a member.") });

export const loadOlderMessagesSchema = z.object({
  conversationId: UUID,
  beforeId: z.guid(),
  limit: z.number().int().min(1).max(100).default(30),
});

export const loadNewerMessagesSchema = z.object({
  conversationId: UUID,
  since: z.string().datetime({ offset: true }),
});

export const markConversationReadSchema = z.object({ conversationId: UUID });
