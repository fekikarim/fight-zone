import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getAuthorizedMessagingRecipients, getMyConversations } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import Image from "next/image";
import { InboxList } from "@/components/messages/inbox-list";
import { StartConversationForm } from "@/components/messages/start-conversation-form";

export const metadata: Metadata = {
  title: "Messages",
  description: "Message your coach and keep every training conversation in one place.",
};

export default async function MemberMessagesPage() {
  const user = await requireUser();
  const [conversations, recipients] = await Promise.all([
    getMyConversations(),
    getAuthorizedMessagingRecipients(),
  ]);

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Messages
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          You can message any coach you have booked a session with. Unread
          replies show a badge in the sidebar.
        </p>
      </div>

      <StartConversationForm recipients={recipients} />

      {conversations.length > 0 ? (
        <InboxList
          conversations={conversations}
          currentUserId={user.id}
          hrefPrefix="/member/messages"
          otherFallback="Coach"
        />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40 p-8 sm:p-14 mt-4">
          <div className="absolute right-0 top-0 h-full w-full opacity-10 sm:w-1/2">
            <Image src="/components/hand-holding-medal-720x720.jpg" alt="Medal" fill className="object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-soft via-ink-soft/90 to-transparent sm:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-soft/40 via-ink-soft/80 to-transparent sm:block" />
          </div>
          <div className="relative z-10 flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              Stay connected to your corner
            </h2>
            <p className="text-base text-zinc-300">
              No messages yet. When you book a session, you'll be able to communicate directly with Coach Seif right here.
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
