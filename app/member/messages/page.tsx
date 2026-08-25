import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getAuthorizedMessagingRecipients, getMyConversations } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/empty-state";
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
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" aria-hidden />}
          title="No conversations yet"
          description="When you book a session with a coach you can start chatting right here."
        />
      )}
    </Container>
  );
}
