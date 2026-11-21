import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getConversationMember, getConversationMessages } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { MessageThread } from "@/components/messages/message-thread";

type Params = Promise<{ conversationId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { conversationId } = await params;
  const member = await getConversationMember(conversationId);
  return { title: member?.full_name ? `Chat with ${member.full_name}` : "Messages" };
}

export default async function AdminMessageThreadPage({ params }: { params: Params }) {
  const user = await requireRole(["ADMIN", "COACH"]);
  const { conversationId } = await params;
  const member = await getConversationMember(conversationId);
  if (!member) notFound();
  const messages = await getConversationMessages(conversationId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader
        eyebrow="Engage"
        title={member.full_name ?? "Member"}
        back={{ href: "/admin/messages", label: "All conversations" }}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" aria-hidden />{member.email}</a>
            {member.phone ? <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" aria-hidden />{member.phone}</a> : null}
          </span>
        }
      />
      <MessageThread
        conversationId={conversationId}
        memberId={member.member_id}
        currentUserId={user.id}
        initialMessages={messages}
        hasMore={messages.length >= 30}
        otherLabel={member.full_name ?? "Member"}
      />
    </div>
  );
}
