import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle, Search } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getInbox } from "@/lib/supabase/queries";
import { getMembers } from "@/lib/members/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { UserAvatar } from "@/components/messages/user-avatar";
import { NewConversationPicker } from "@/components/messages/new-conversation-picker";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminMessagesPage({ searchParams }: Props) {
  const user = await requireRole(["ADMIN", "COACH"]);
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 80) : "";
  const [inbox, members] = await Promise.all([getInbox(search), getMembers({ limit: 200 })]);
  const unread = inbox.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engage"
        title="Messages"
        description={unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Private conversations with your members."}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form role="search" className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="inbox-search" className="sr-only">Search conversations</label>
          <input id="inbox-search" name="q" defaultValue={search} placeholder="Search by name or email…"
            className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft/40 pl-9 pr-3 text-base sm:text-sm" />
        </form>
        <NewConversationPicker members={members.items} />
      </div>

      {inbox.length ? (
        <ul className="divide-y divide-ink-border overflow-hidden rounded-xl border border-ink-border">
          {inbox.map((c) => {
            const preview =
              c.last_kind === "SYSTEM" ? `Fight Zone: ${c.last_message_body ?? ""}` :
              c.last_sender_id === user.id ? `You: ${c.last_message_body ?? ""}` : c.last_message_body ?? "No messages yet";
            return (
              <li key={c.conversation_id}>
                <Link href={`/admin/messages/${c.conversation_id}`}
                  className={cn("flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-soft/50", c.unread_count > 0 && "bg-primary-soft/20")}>
                  <UserAvatar name={c.member_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", c.unread_count > 0 ? "font-semibold" : "font-medium")}>{c.member_name ?? c.member_email ?? "Member"}</p>
                      {c.last_message_at ? (
                        <time className="shrink-0 text-xs text-muted">{formatDate(c.last_message_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted">{preview}</p>
                  </div>
                  {c.unread_count > 0 ? (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{c.unread_count}</span>
                  ) : <ChevronRight className="h-4 w-4 text-muted" aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
          <MessageCircle className="h-9 w-9 text-primary" aria-hidden />
          <p className="text-sm text-muted">{search ? "No conversation matches your search." : "No conversations yet. Members can message you from their portal."}</p>
        </div>
      )}
    </div>
  );
}
