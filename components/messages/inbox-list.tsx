import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/messages/user-avatar";
import { formatDate } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/types/messaging";

interface InboxListProps {
  conversations: ConversationSummary[];
  currentUserId: string;
  /** Base path for the inbox links ("/member/messages" or "/admin/messages"). */
  hrefPrefix: string;
  /** Fallback label for the other participant when they have no name. */
  otherFallback: string;
}

/**
 * The inbox: one row per conversation, newest activity first, with the other
 * participant, a last-message preview and the per-conversation unread badge.
 */
export function InboxList({
  conversations,
  currentUserId,
  hrefPrefix,
  otherFallback,
}: InboxListProps) {
  return (
    <ul className="flex flex-col divide-y divide-ink-border overflow-hidden rounded-xl border border-ink-border bg-ink-soft/40">
      {conversations.map((conversation) => {
        const preview = conversation.last_message_body;
        const prefix = preview
          ? conversation.last_sender_id === currentUserId
            ? "You: "
            : ""
          : "";
        return (
          <li key={conversation.conversation_id}>
            <Link
              href={`${hrefPrefix}/${conversation.conversation_id}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-ink-soft sm:px-5"
            >
              <UserAvatar name={conversation.other_full_name} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">
                    {conversation.other_full_name ?? otherFallback}
                  </span>
                  {conversation.last_message_at ? (
                    <time className="shrink-0 text-xs text-muted">
                      {formatDate(conversation.last_message_at, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted">
                  {preview ? `${prefix}${preview}` : "No messages yet — say hello!"}
                </p>
              </div>
              {conversation.unread_count > 0 ? (
                <Badge variant="solid" aria-label={`${conversation.unread_count} unread`}>
                  {conversation.unread_count}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
