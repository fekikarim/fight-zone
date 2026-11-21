import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { UserAvatar } from "@/components/messages/user-avatar";
import { cn, formatDate } from "@/lib/utils";
import type { InboxItem } from "@/lib/types/messaging";

/** "14:02" today, "Mon" this week, "12 Nov" otherwise — like a phone inbox. */
function shortTime(iso: string): string {
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 86_400_000;
  if (days < 1 && new Date().getDate() === d.getDate()) return formatDate(iso, { hour: "numeric", minute: "2-digit" });
  if (days < 7) return formatDate(iso, { weekday: "short" });
  return formatDate(iso, { day: "numeric", month: "short" });
}

/** Coach inbox: chat-app conversation cards; `activeId` highlights the open one. */
export function ConversationList({
  items,
  currentUserId,
  activeId,
  search,
}: {
  items: InboxItem[];
  currentUserId: string;
  activeId?: string;
  search?: string;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
        <MessageCircle className="h-9 w-9 text-primary" aria-hidden />
        <p className="text-sm text-muted">
          {search ? "No conversation matches your search." : "No conversations yet. Members can message you from their portal."}
        </p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((c) => {
        const unread = c.unread_count > 0;
        const active = c.conversation_id === activeId;
        const preview =
          c.last_kind === "SYSTEM" ? `Fight Zone: ${c.last_message_body ?? ""}` :
          c.last_sender_id === currentUserId ? `You: ${c.last_message_body ?? ""}` : c.last_message_body ?? "No messages yet";
        return (
          <li key={c.conversation_id}>
            <Link
              href={`/admin/messages/${c.conversation_id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3.5 rounded-3xl p-3 transition-[background-color,transform] duration-200 active:scale-[0.99]",
                active ? "bg-primary/15 ring-1 ring-primary/40" : unread ? "bg-white/[0.04] hover:bg-white/[0.07]" : "hover:bg-white/[0.05]",
              )}
            >
              <span className="relative">
                <UserAvatar name={c.member_name} size="lg" />
                {unread ? <span className="absolute -right-0.5 top-0 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-ink" aria-hidden /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-base", unread ? "font-bold" : "font-semibold")}>
                    {c.member_name ?? c.member_email ?? "Member"}
                  </span>
                  {c.last_message_at ? (
                    <time dateTime={c.last_message_at} className={cn("shrink-0 text-xs", unread ? "font-semibold text-primary-readable" : "text-muted")}>
                      {shortTime(c.last_message_at)}
                    </time>
                  ) : null}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "text-foreground/85" : "text-muted")}>{preview}</span>
                  {unread ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular">
                      {c.unread_count}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
