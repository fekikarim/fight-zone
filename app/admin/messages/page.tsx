import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getInbox } from "@/lib/supabase/queries";
import { getMembers } from "@/lib/members/queries";
import { InboxPanel } from "@/components/messages/inbox-panel";

export const metadata: Metadata = { title: "Messages" };

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/** Inbox. Phones: the list. Desktop: list + "pick a conversation" pane. */
export default async function AdminMessagesPage({ searchParams }: Props) {
  const user = await requireRole(["ADMIN", "COACH"]);
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 80) : "";
  const [inbox, members] = await Promise.all([getInbox(search), getMembers({ limit: 200 })]);

  return (
    <div className="grid gap-6 lg:h-[calc(100dvh-15rem)] lg:min-h-[520px] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <InboxPanel items={inbox} members={members.items} currentUserId={user.id} search={search} />
      <div className="hidden flex-col items-center justify-center gap-4 rounded-[28px] border border-white/[0.08] bg-ink-soft/60 p-10 text-center lg:flex">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white shadow-[var(--shadow-hit)]">
          <MessagesSquare className="h-9 w-9" aria-hidden />
        </span>
        <p className="font-display text-3xl font-bold uppercase leading-tight">Your corner</p>
        <p className="max-w-sm text-sm text-muted">Pick a conversation on the left, or start a new one with any member.</p>
      </div>
    </div>
  );
}
