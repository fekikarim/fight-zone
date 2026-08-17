"use client";

import { useActionState } from "react";
import { MessageSquarePlus } from "lucide-react";
import {
  startConversation,
  type MessageActionState,
} from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { MessagingRecipient } from "@/lib/types/messaging";

interface StartConversationFormProps {
  recipients: MessagingRecipient[];
}

/**
 * Picks an authorized recipient (a coach a member has booked with, or a
 * member who booked a coach) and opens/resumes the conversation. The action
 * redirects to the thread on success; the database RLS re-checks the booking
 * relationship server-side.
 */
export function StartConversationForm({ recipients }: StartConversationFormProps) {
  const [state, formAction, isPending] = useActionState(startConversation, {
    ok: false,
  } satisfies MessageActionState);

  if (recipients.length === 0) return null;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:flex-row sm:items-center"
    >
      <label htmlFor="recipient" className="text-sm font-medium">
        Message
      </label>
      <select
        id="recipient"
        name="recipientId"
        required
        className="h-11 flex-1 rounded-md border border-ink-border bg-ink-soft px-3.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-ring"
      >
        {recipients.map((recipient) => (
          <option key={recipient.id} value={recipient.id}>
            {recipient.full_name ?? (recipient.role === "coach" ? "Coach" : "Member")}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner size="sm" />
            Opening…
          </>
        ) : (
          <>
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Start conversation
          </>
        )}
      </Button>
      {state.message && !state.ok ? (
        <p role="alert" className="text-sm text-primary sm:col-span-3">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
