import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getAuthorizedMessagingRecipients, getMyConversations } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/empty-state";
import { InboxList } from "@/components/messages/inbox-list";
import { StartConversationForm } from "@/components/messages/start-conversation-form";

export const metadata: Metadata = {
  title: "Messages",
  description: "Chat with the members who train with you.",
};

export default async function AdminMessagesPage() {
  const user = await requireRole(["ADMIN", "COACH"]);
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
          Chat with the members who book your sessions. You only ever see the
          conversations you are part of.
        </p>
      </div>

      <StartConversationForm recipients={recipients} />

      {conversations.length > 0 ? (
        <InboxList
          conversations={conversations}
          currentUserId={user.id}
          hrefPrefix="/admin/messages"
          otherFallback="Member"
        />
      ) : (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" aria-hidden />}
          title="No conversations yet"
          description="When a member books one of your sessions you can message them right here."
        />
      )}
    </Container>
  );
}
