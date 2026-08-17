import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getConversationMessages, getMyConversations } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { UserAvatar } from "@/components/messages/user-avatar";
import { MessageThread } from "@/components/messages/message-thread";

type Params = Promise<{ conversationId: string }>;

async function findConversation(conversationId: string) {
  const conversations = await getMyConversations();
  const summary = conversations.find((c) => c.conversation_id === conversationId);
  if (!summary) throw new NotFoundError("This conversation could not be found.");
  return summary;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { conversationId } = await params;
  const summary = await findConversation(conversationId);
  return {
    title: summary.other_full_name
      ? `Chat with ${summary.other_full_name}`
      : "Messages",
    description: "A private conversation at Fight Zone.",
  };
}

export default async function AdminMessageThreadPage({ params }: { params: Params }) {
  const { conversationId } = await params;
  const [user, summary, initialMessages] = await Promise.all([
    requireRole(["ADMIN", "COACH"]),
    findConversation(conversationId),
    getConversationMessages(conversationId),
  ]);

  return (
    <Container className="flex max-w-none flex-col gap-6 px-0">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/admin/messages">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All messages
        </Link>
      </Button>

      <div className="flex items-center gap-4">
        <UserAvatar name={summary.other_full_name} size="lg" />
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            {summary.other_full_name ?? "Member"}
          </h1>
          <p className="text-sm text-muted">
            Your private conversation with {summary.other_full_name ?? "this member"}.
          </p>
        </div>
      </div>

      <MessageThread
        conversationId={conversationId}
        currentUserId={user.id}
        initialMessages={initialMessages}
        hasMore={initialMessages.length >= 50}
      />
    </Container>
  );
}
