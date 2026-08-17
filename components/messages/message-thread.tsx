"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Send, MessageCircle } from "lucide-react";
import {
  loadOlderMessages,
  markConversationRead,
  sendMessage,
  type MessageActionState,
} from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDate } from "@/lib/utils";
import type { ConversationMessage } from "@/lib/types/messaging";

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  /** Newest-first page rendered by the server. */
  initialMessages: ConversationMessage[];
  /** Whether an older page may exist beyond the initial one. */
  hasMore: boolean;
}

/**
 * The message thread: history (newest-first from the server, displayed
 * oldest-first), keyset "Load older" pagination, instant replies, and
 * mark-as-read when opened. Read/write authority lives in the server actions
 * and the RLS-scoped RPCs — this component only renders and calls them.
 */
export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
  hasMore,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(() =>
    [...initialMessages].reverse(),
  );
  const [moreAvailable, setMoreAvailable] = useState(hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAppendedId = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(sendMessage, {
    ok: false,
  } satisfies MessageActionState);

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (!state.ok || !state.created) return;
    if (state.created.id === lastAppendedId.current) return;
    lastAppendedId.current = state.created.id;
    setMessages((prev) => [...prev, state.created!]);
    setBody("");
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state]);

  async function handleLoadOlder() {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const { messages: older } = await loadOlderMessages(conversationId, oldest.id);
    setMessages((prev) => [...older.reverse(), ...prev]);
    setMoreAvailable(older.length >= 50);
    setLoadingOlder(false);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-border bg-ink-soft/30">
      <div
        ref={scrollRef}
        className="flex max-h-[52vh] min-h-[320px] flex-col gap-3 overflow-y-auto p-4 sm:p-5"
      >
        {moreAvailable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mx-auto"
            onClick={handleLoadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? (
              <>
                <Spinner size="sm" />
                Loading…
              </>
            ) : (
              "Load older messages"
            )}
          </Button>
        ) : null}

        {messages.length > 0 ? (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%]",
                    mine
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm border border-ink-border bg-ink-soft text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1.5 text-[10px]",
                      mine ? "justify-end text-white/70" : "text-muted",
                    )}
                  >
                    <time>
                      {formatDate(message.created_at, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                    {mine && message.status === "READ" ? <span>· Read</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="h-8 w-8 text-muted" aria-hidden />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-muted">Say hello and start the conversation.</p>
          </div>
        )}
      </div>

      <form
        action={formAction}
        className="flex items-end gap-3 border-t border-ink-border bg-background/60 p-3 sm:p-4"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <div className="flex flex-1 flex-col gap-1">
          <Textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Write a message…"
            className="min-h-[52px] max-h-40 flex-1"
          />
          {state.message && !state.ok ? (
            <p role="alert" className="text-xs text-primary">
              {state.errors?.body ?? state.message}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          size="sm"
          className="h-11 shrink-0 gap-2"
          disabled={isPending || body.trim().length === 0}
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              Sending…
            </>
          ) : (
            <>
              Send
              <Send className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
