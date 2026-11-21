"use client";

import { useActionState } from "react";
import { Loader2, PenSquare } from "lucide-react";
import { openConversationWithMember, type MessageActionState } from "@/lib/actions/messages";
import { Select } from "@/components/ui/select";

/** Seif starts (or resumes) a conversation with any member. */
export function NewConversationPicker({ members }: { members: Array<{ id: string; full_name: string | null; email: string }> }) {
  const [state, action, pending] = useActionState<MessageActionState, FormData>(openConversationWithMember, { ok: false });
  if (!members.length) return null;
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor="new-conv-member" className="sr-only">Start a conversation with</label>
        <Select
          id="new-conv-member"
          name="memberId"
          required
          defaultValue=""
          className="h-11 min-w-0 flex-1 rounded-full border border-white/[0.08] bg-ink-soft px-4 text-base text-foreground transition-colors focus-visible:border-foreground/40 focus-visible:outline-none sm:text-sm"
        >
          <option value="" disabled>New message to…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ? `${m.full_name} — ${m.email}` : m.email}</option>
          ))}
        </Select>
        <button
          type="submit"
          disabled={pending}
          aria-label="Open conversation"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-[transform,background-color] hover:bg-primary-hover active:scale-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PenSquare className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {state.message && !state.ok ? <p role="alert" className="px-2 text-sm text-danger">{state.message}</p> : null}
    </form>
  );
}
