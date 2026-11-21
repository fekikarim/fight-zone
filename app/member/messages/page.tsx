import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getConversationMessages, getMyConversationId } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata: Metadata = {
  title: "Messages",
  description: "Your private conversation with Coach Seif.",
};

export default async function MemberMessagesPage() {
  const user = await requireUser();
  const conversationId = await getMyConversationId();
  const messages = conversationId ? await getConversationMessages(conversationId) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        eyebrow="Member area"
        title="Coach Seif"
        description="Your private conversation. Only you and Coach Seif can read it. Automatic Fight Zone notices about your registrations and payments appear here too."
      />
      {conversationId ? (
        <MessageThread
          conversationId={conversationId}
          memberId={user.id}
          currentUserId={user.id}
          initialMessages={messages}
          hasMore={messages.length >= 30}
          otherLabel="Coach Seif"
        />
      ) : (
        <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-12 text-center text-sm text-muted">
          Messaging isn&apos;t available right now. Please try again later.
        </p>
      )}
    </div>
  );
}
