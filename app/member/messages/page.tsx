import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getConversationMessages, getMyConversationId } from "@/lib/supabase/queries";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata: Metadata = {
  title: "Messages",
  description: "Your private conversation with Coach Seif.",
};

const SUGGESTIONS = [
  "When is the next event?",
  "I've paid by bank transfer",
  "Is there a session for beginners?",
  "I can't make it to my event",
];

/** The member's one conversation with Coach Seif — full screen on phones. */
export default async function MemberMessagesPage() {
  const user = await requireUser();
  const conversationId = await getMyConversationId();
  const messages = conversationId ? await getConversationMessages(conversationId) : [];

  return (
    <div className="mx-auto w-full max-w-4xl lg:h-[calc(100dvh-15rem)] lg:min-h-[520px]">
      <h1 className="sr-only">Messages with Coach Seif</h1>
      {conversationId ? (
        <MessageThread
          conversationId={conversationId}
          memberId={user.id}
          currentUserId={user.id}
          initialMessages={messages}
          hasMore={messages.length >= 30}
          otherLabel="Coach Seif"
          suggestions={SUGGESTIONS}
          header={{ subtitle: "Your coach · replies personally", backHref: "/member" }}
        />
      ) : (
        <p className="rounded-3xl border border-dashed border-white/15 px-5 py-12 text-center text-sm text-muted">
          Messaging isn&apos;t available right now. Please try again later.
        </p>
      )}
    </div>
  );
}
