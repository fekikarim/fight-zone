import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getConversationMember, getConversationMessages, getInbox } from "@/lib/supabase/queries";
import { getMembers } from "@/lib/members/queries";
import { MessageThread } from "@/components/messages/message-thread";
import { InboxPanel } from "@/components/messages/inbox-panel";

type Params = Promise<{ conversationId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { conversationId } = await params;
  const member = await getConversationMember(conversationId);
  return { title: member?.full_name ? `Chat with ${member.full_name}` : "Messages" };
}

const iconBtn = "flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground";

/** Phones: full-screen chat. Desktop: inbox on the left, chat on the right. */
export default async function AdminMessageThreadPage({ params }: { params: Params }) {
  const user = await requireRole(["ADMIN", "COACH"]);
  const { conversationId } = await params;
  const member = await getConversationMember(conversationId);
  if (!member) notFound();
  const [messages, inbox, members] = await Promise.all([
    getConversationMessages(conversationId),
    getInbox(""),
    getMembers({ limit: 200 }),
  ]);
  const name = member.full_name ?? "Member";

  return (
    <div className="lg:grid lg:h-[calc(100dvh-15rem)] lg:min-h-[520px] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-6">
      <div className="hidden min-h-0 lg:flex">
        <InboxPanel items={inbox} members={members.items} currentUserId={user.id} activeId={conversationId} headingLevel="h2" />
      </div>
      <h1 className="sr-only">Conversation with {name}</h1>
      <MessageThread
        conversationId={conversationId}
        memberId={member.member_id}
        currentUserId={user.id}
        initialMessages={messages}
        hasMore={messages.length >= 30}
        otherLabel={name}
        header={{
          subtitle: member.email,
          backHref: "/admin/messages",
          actions: (
            <>
              {member.phone ? <a href={`tel:${member.phone}`} aria-label={`Call ${name}`} className={iconBtn}><Phone className="h-5 w-5" aria-hidden /></a> : null}
              <a href={`mailto:${member.email}`} aria-label={`Email ${name}`} className={iconBtn}><Mail className="h-5 w-5" aria-hidden /></a>
              <Link href={`/admin/members/${member.member_id}`} aria-label={`${name}'s profile`} className={iconBtn}><UserRound className="h-5 w-5" aria-hidden /></Link>
            </>
          ),
        }}
      />
    </div>
  );
}
