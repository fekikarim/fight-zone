"use client";

import { useActionState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/form-feedback";
import { openConversationWithMember, type MessageActionState } from "@/lib/actions/messages";

/** Seif starts (or resumes) a conversation with any member. */
export function NewConversationPicker({ members }: { members: Array<{ id: string; full_name: string | null; email: string }> }) {
  const [state, action, pending] = useActionState<MessageActionState, FormData>(openConversationWithMember, { ok: false });
  if (!members.length) return null;
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="new-conv-member" className="sr-only">Member</label>
      <select id="new-conv-member" name="memberId" required defaultValue="" className={fieldClass(false, "sm:w-80")}>
        <option value="" disabled>Message a member…</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.full_name ? `${m.full_name} — ${m.email}` : m.email}</option>
        ))}
      </select>
      <Button type="submit" disabled={pending} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
        Open conversation
      </Button>
      {state.message && !state.ok ? <p role="alert" className="text-sm text-primary">{state.message}</p> : null}
    </form>
  );
}
