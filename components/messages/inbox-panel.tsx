import { Search } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import { NewConversationPicker } from "@/components/messages/new-conversation-picker";
import type { InboxItem } from "@/lib/types/messaging";

/** Coach inbox column: title, search, start-a-conversation and the list. */
export function InboxPanel({
  items,
  members,
  currentUserId,
  activeId,
  search,
  headingLevel = "h1",
}: {
  items: InboxItem[];
  members: Array<{ id: string; full_name: string | null; email: string }>;
  currentUserId: string;
  activeId?: string;
  search?: string;
  headingLevel?: "h1" | "h2";
}) {
  const H = headingLevel;
  const unread = items.reduce((s, c) => s + c.unread_count, 0);
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <H className="font-display text-4xl font-bold uppercase leading-none tracking-tight">Messages</H>
          <p className="mt-1.5 text-sm text-muted">{unread ? `${unread} unread` : "All caught up"}</p>
        </div>
      </div>
      <form role="search" action="/admin/messages" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="inbox-search" className="sr-only">Search conversations</label>
        <input
          id="inbox-search"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Search"
          className="h-11 w-full rounded-full border border-white/[0.08] bg-ink-soft pl-11 pr-4 text-base transition-colors focus-visible:border-foreground/40 focus-visible:outline-none sm:text-sm"
        />
      </form>
      <NewConversationPicker members={members} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:-mx-1 lg:px-1">
        <ConversationList items={items} currentUserId={currentUserId} activeId={activeId} search={search} />
      </div>
    </div>
  );
}
