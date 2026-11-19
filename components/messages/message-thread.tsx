"use client";

import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, Check, CheckCheck, Clock, FileText, Loader2, MessageCircle, Paperclip, RotateCw, Send, ShieldCheck, X,
} from "lucide-react";
import { loadNewerMessages, loadOlderMessages, markConversationRead, sendMessage } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { businessDateKey } from "@/lib/timezone";
import { cn, formatDate } from "@/lib/utils";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES, type ConversationMessage } from "@/lib/types/messaging";

interface MessageThreadProps {
  conversationId: string;
  /** Owner of the private attachment folder (<memberId>/messages/…). */
  memberId: string;
  currentUserId: string;
  /** Newest-first page rendered by the server. */
  initialMessages: ConversationMessage[];
  hasMore: boolean;
  /** Label for messages from the other person. */
  otherLabel: string;
}

/** Local delivery state for my own messages (server rows are always "sent"). */
type Delivery = "sending" | "failed";
type Msg = ConversationMessage & { _local?: { delivery: Delivery; file?: File; preview?: string } };

const PAGE = 30;
const SAFETY_POLL_MS = 30_000;
const TYPING_TTL_MS = 3_500;

const byTime = (a: Msg, b: Msg) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

/**
 * Private conversation, chat-app style.
 * - Delivery: Supabase Realtime postgres_changes on `messages` (RLS scopes
 *   rows to the two participants) → rows merge instantly; a slow safety poll
 *   and focus refetch catch anything missed during reconnects.
 * - Sending is optimistic with explicit failed/retry state; the server row
 *   replaces the temporary one (dedupe by id).
 * - Read receipts update live (UPDATE events on read_at/status).
 * - Typing indicator over a broadcast channel keyed by the (unguessable)
 *   conversation id; it carries no message content.
 */
export function MessageThread({ conversationId, memberId, currentUserId, initialMessages, hasMore, otherLabel }: MessageThreadProps) {
  const [messages, setMessages] = useState<Msg[]>(() => [...initialMessages].sort(byTime));
  const [moreAvailable, setMoreAvailable] = useState(hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [unseenBelow, setUnseenBelow] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelId = useId();
  const atBottomRef = useRef(true);
  const typingChannel = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<number | null>(null);
  const readTimer = useRef<number | null>(null);
  const prevCount = useRef(messages.length);

  // ── helpers ───────────────────────────────────────────────
  const latestRef = useRef<string | null>(null);
  useEffect(() => {
    let latest: string | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i]._local) { latest = messages[i].created_at; break; }
    }
    latestRef.current = latest;
  }, [messages]);

  const scheduleRead = useCallback(() => {
    if (readTimer.current) window.clearTimeout(readTimer.current);
    readTimer.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") void markConversationRead(conversationId);
    }, 400);
  }, [conversationId]);

  /** Merge server rows; an incoming copy of my optimistic message replaces it. */
  const merge = useCallback((rows: ConversationMessage[]) => {
    if (!rows.length) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const r of rows) {
        // Drop a matching optimistic bubble (same sender + body, still sending).
        if (r.sender_id === currentUserId) {
          for (const [id, m] of map) {
            if (m._local?.delivery === "sending" && m.body === r.body && (m.attachment_name ?? null) === (r.attachment_name ?? null)) {
              map.delete(id);
              break;
            }
          }
        }
        map.set(r.id, { ...(map.get(r.id) ?? {}), ...r, _local: undefined });
      }
      return [...map.values()].sort(byTime);
    });
    if (rows.some((r) => r.sender_id !== currentUserId && r.status === "UNREAD")) scheduleRead();
  }, [currentUserId, scheduleRead]);

  const refetchNewer = useCallback(async () => {
    const since = latestRef.current ?? new Date(Date.now() - 5 * 60_000).toISOString();
    try {
      const { messages: newer } = await loadNewerMessages(conversationId, since);
      merge(newer);
    } catch {
      /* next tick retries */
    }
  }, [conversationId, merge]);

  // ── scrolling ─────────────────────────────────────────────
  const scrollToEnd = (smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnseenBelow(0);
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => {
    const added = messages.length - prevCount.current;
    prevCount.current = messages.length;
    if (added <= 0) return;
    const last = messages[messages.length - 1];
    if (atBottomRef.current || last?.sender_id === currentUserId) scrollToEnd(true);
    else setUnseenBelow((n) => n + added);
  }, [messages, currentUserId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottomRef.current) setUnseenBelow(0);
  };

  // ── realtime + safety net ─────────────────────────────────
  useEffect(() => {
    void markConversationRead(conversationId);
    const supabase = createClient();
    let rows: ReturnType<typeof supabase.channel> | null = null;
    let typing: ReturnType<typeof supabase.channel> | null = null;
    try {
      rows = supabase
        .channel(`thread-${conversationId}-${channelId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            merge([payload.new as ConversationMessage]);
            if ((payload.new as ConversationMessage).sender_id !== currentUserId) setOtherTyping(false);
          })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => merge([payload.new as ConversationMessage]))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void refetchNewer(); // catch up after (re)connect
        });
      typing = supabase
        .channel(`typing-${conversationId}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.userId === currentUserId) return;
          setOtherTyping(true);
          if (typingTimer.current) window.clearTimeout(typingTimer.current);
          typingTimer.current = window.setTimeout(() => setOtherTyping(false), TYPING_TTL_MS);
        })
        .subscribe();
      typingChannel.current = typing;
    } catch {
      rows = null;
    }

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetchNewer();
    }, SAFETY_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refetchNewer();
        scheduleRead();
      }
    };
    const onOnline = () => { setOnline(true); void refetchNewer(); };
    const onOffline = () => setOnline(false);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (readTimer.current) window.clearTimeout(readTimer.current);
      if (rows) void supabase.removeChannel(rows);
      if (typing) void supabase.removeChannel(typing);
      typingChannel.current = null;
    };
  }, [conversationId, channelId, currentUserId, merge, refetchNewer, scheduleRead]);

  const announceTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    void typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } });
  };

  // ── older history ─────────────────────────────────────────
  async function handleLoadOlder() {
    const oldest = messages.find((m) => !m._local);
    if (loadingOlder || !oldest) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const { messages: older } = await loadOlderMessages(conversationId, oldest.id, PAGE);
      prevCount.current += older.length; // don't treat history as "new"
      setMessages((prev) => [...older, ...prev].sort(byTime));
      setMoreAvailable(older.length >= PAGE);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch {
      toast.error("Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  // ── sending ───────────────────────────────────────────────
  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(f.type)) return void toast.error("Attach a PNG, JPEG, WebP image or a PDF.");
    if (f.size > ATTACHMENT_MAX_BYTES) return void toast.error("Attachments can be up to 5 MB.");
    setFile(f);
    setFilePreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };
  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  async function deliver(temp: Msg) {
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("body", temp.body);
    const f = temp._local?.file;
    try {
      if (f) {
        const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" }[f.type] ?? "bin";
        const path = `${memberId}/messages/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await createClient().storage.from("fightzone-private").upload(path, f, { contentType: f.type });
        if (error) throw error;
        fd.set("attachmentPath", path);
        fd.set("attachmentName", f.name.slice(0, 200));
        fd.set("attachmentMime", f.type);
        fd.set("attachmentSize", String(f.size));
      }
      const res = await sendMessage({ ok: false }, fd);
      if (!res.ok || !res.created) throw new Error(res.message ?? "send failed");
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== temp.id && m.id !== res.created!.id);
        return [...without, { ...res.created! }].sort(byTime);
      });
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, _local: { ...m._local!, delivery: "failed" } } : m)));
    }
  }

  function send() {
    const text = body.trim();
    if (!text && !file) return;
    const temp: Msg = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender_id: currentUserId,
      body: text || (file?.type === "application/pdf" ? "📎 Document" : "📷 Photo"),
      status: "UNREAD",
      created_at: new Date().toISOString(),
      kind: "USER",
      read_at: null,
      attachment_path: null,
      attachment_name: file?.name ?? null,
      attachment_mime: file?.type ?? null,
      attachment_size: file?.size ?? null,
      _local: { delivery: "sending", file: file ?? undefined, preview: filePreview ?? undefined },
    };
    setMessages((prev) => [...prev, temp]);
    setBody("");
    clearFile();
    inputRef.current?.focus();
    void deliver(temp);
  }

  const retry = (m: Msg) => {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, _local: { ...x._local!, delivery: "sending" } } : x)));
    void deliver({ ...m, _local: { ...m._local!, delivery: "sending" } });
  };
  const discard = (m: Msg) => setMessages((prev) => prev.filter((x) => x.id !== m.id));

  // Auto-grow composer.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  const lastSeenMine = [...messages].reverse().find((m) => m.sender_id === currentUserId && m.kind === "USER" && m.read_at)?.id;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ink-border bg-ink-soft/30">
      {!online ? (
        <p className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-200" role="status">
          You&apos;re offline — messages will sync when you reconnect.
        </p>
      ) : null}
      <div ref={scrollRef} onScroll={onScroll}
        className="flex h-[calc(100dvh-20rem)] min-h-[320px] flex-col gap-1 overflow-y-auto overscroll-contain p-3 sm:h-[60dvh] sm:p-5"
        role="log" aria-live="polite" aria-label="Messages">
        {moreAvailable ? (
          <Button type="button" variant="outline" size="sm" className="mx-auto mb-2 gap-2" onClick={handleLoadOlder} disabled={loadingOlder}>
            {loadingOlder ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loadingOlder ? "Loading…" : "Load older messages"}
          </Button>
        ) : null}

        {messages.length ? (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || businessDateKey(prev.created_at) !== businessDateKey(m.created_at);
            const grouped = !newDay && prev && prev.sender_id === m.sender_id && prev.kind === m.kind &&
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
            return (
              <Fragment key={m.id}>
                {newDay ? <DayDivider iso={m.created_at} /> : null}
                {m.kind === "SYSTEM" ? (
                  <SystemNotice m={m} />
                ) : (
                  <Bubble m={m} mine={m.sender_id === currentUserId} otherLabel={otherLabel} grouped={!!grouped}
                    seen={m.id === lastSeenMine} onOpenImage={setLightbox} onRetry={retry} onDiscard={discard} />
                )}
              </Fragment>
            );
          })
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="h-8 w-8 text-muted" aria-hidden />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-muted">Say hello and start the conversation.</p>
          </div>
        )}
        {otherTyping ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted" aria-live="polite">
            <span className="inline-flex gap-1 rounded-full bg-ink-soft px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
            </span>
            {otherLabel} is typing…
          </div>
        ) : null}
      </div>

      {unseenBelow > 0 ? (
        <button type="button" onClick={() => scrollToEnd(true)}
          className="absolute bottom-24 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          <ArrowDown className="h-3.5 w-3.5" aria-hidden /> {unseenBelow} new message{unseenBelow === 1 ? "" : "s"}
        </button>
      ) : null}

      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-ink-border bg-background/80 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:p-3">
        {file ? (
          <div className="mb-2 flex items-center gap-3 rounded-lg border border-ink-border bg-ink-soft p-2 text-xs">
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={filePreview} alt="" className="h-12 w-12 rounded object-cover" />
            ) : <FileText className="h-6 w-6" aria-hidden />}
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button type="button" onClick={clearFile} className="rounded p-1 text-muted hover:text-foreground" aria-label="Remove attachment">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept={ATTACHMENT_MIME_TYPES.join(",")} className="sr-only" id={`attach-${channelId}`}
            onChange={(e) => pickFile(e.target.files?.[0])} />
          <label htmlFor={`attach-${channelId}`} title="Attach a photo or PDF" aria-label="Attach a photo or PDF"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-ink-soft hover:text-foreground">
            <Paperclip className="h-5 w-5" aria-hidden />
          </label>
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => { setBody(e.target.value); announceTyping(); }}
            rows={1}
            maxLength={4000}
            onKeyDown={(e) => {
              const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
              if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            onPaste={(e) => {
              const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
              if (f) { e.preventDefault(); pickFile(f); }
            }}
            aria-label="Message"
            placeholder="Message"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-ink-border bg-ink-soft px-4 py-2.5 text-base leading-snug focus-visible:border-primary focus-visible:outline-none sm:text-sm"
          />
          <Button type="submit" className="h-11 w-11 shrink-0 rounded-full p-0" disabled={!body.trim() && !file} aria-label="Send">
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p className="mt-1 hidden px-14 text-[10px] text-muted sm:block">Enter to send · Shift+Enter for a new line · paste images directly</p>
      </form>

      {lightbox ? (
        <div role="dialog" aria-modal="true" aria-label="Image" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)} onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close" autoFocus>
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      ) : null}
    </div>
  );
}

/** "Today" / "Yesterday" / long date, in the club's timezone. */
function relativeDayLabel(iso: string): string {
  const key = businessDateKey(iso);
  if (key === businessDateKey(new Date())) return "Today";
  if (key === businessDateKey(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return formatDate(iso, { weekday: "long", day: "numeric", month: "long" });
}

function DayDivider({ iso }: { iso: string }) {
  const label = relativeDayLabel(iso);
  return (
    <div className="my-3 flex justify-center" role="separator">
      <span className="rounded-full bg-ink-soft px-3 py-1 text-[11px] text-muted">{label}</span>
    </div>
  );
}

function SystemNotice({ m }: { m: Msg }) {
  return (
    <div className="mx-auto my-2 w-full max-w-md rounded-xl border border-ink-border bg-background/60 px-4 py-3 text-sm">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Fight Zone · automatic message
      </p>
      <p className="whitespace-pre-wrap break-words text-foreground/90">{m.body}</p>
      <time className="mt-1 block text-[10px] text-muted">{formatDate(m.created_at, { hour: "numeric", minute: "2-digit" })}</time>
    </div>
  );
}

function Bubble({ m, mine, otherLabel, grouped, seen, onOpenImage, onRetry, onDiscard }: {
  m: Msg; mine: boolean; otherLabel: string; grouped: boolean; seen: boolean;
  onOpenImage: (src: string) => void; onRetry: (m: Msg) => void; onDiscard: (m: Msg) => void;
}) {
  const local = m._local;
  const isImage = m.attachment_mime?.startsWith("image/");
  const src = local?.preview ?? (m.attachment_path ? `/api/message-attachments/${m.id}` : null);
  const autoCaption = m.body === "📷 Photo" || m.body === "📎 Document";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}>
      <div className={cn("max-w-[85%] overflow-hidden rounded-2xl text-sm shadow-sm sm:max-w-[68%]",
        mine ? "bg-primary text-white" : "border border-ink-border bg-ink-soft text-foreground",
        mine && !grouped && "rounded-br-md", !mine && !grouped && "rounded-bl-md", local?.delivery === "failed" && "opacity-70")}>
        {!mine && !grouped ? <p className="px-3.5 pt-2 text-[11px] font-semibold text-primary-readable">{otherLabel}</p> : null}
        {(m.attachment_path || local?.file) && isImage && src ? (
          <button type="button" onClick={() => onOpenImage(src)} className="block w-full" aria-label="Open image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={m.attachment_name ?? "Photo"} loading="lazy" className="max-h-80 w-full object-cover" />
          </button>
        ) : null}
        {(m.attachment_path || local?.file) && !isImage ? (
          <a href={local ? undefined : `/api/message-attachments/${m.id}`} target="_blank" rel="noopener noreferrer"
            className={cn("m-1.5 flex items-center gap-2 rounded-xl px-3 py-2.5", mine ? "bg-white/15" : "bg-background/60")}>
            <FileText className="h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-medium">{m.attachment_name ?? "Document"}</span>
              {m.attachment_size ? <span className="text-[10px] opacity-75">PDF · {Math.max(1, Math.round(m.attachment_size / 1024))} KB</span> : null}
            </span>
          </a>
        ) : null}
        <div className="px-3.5 pb-1.5 pt-1.5">
          {!autoCaption || !(m.attachment_path || local?.file) ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
          <div className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", mine ? "text-white/75" : "text-muted")}>
            <time>{formatDate(m.created_at, { hour: "numeric", minute: "2-digit" })}</time>
            {mine ? (
              local?.delivery === "sending" ? <Clock className="h-3 w-3" aria-label="Sending" /> :
              local?.delivery === "failed" ? null :
              m.read_at ? <CheckCheck className="h-3.5 w-3.5 text-sky-200" aria-label="Seen" /> : <Check className="h-3.5 w-3.5" aria-label="Sent" />
            ) : null}
          </div>
        </div>
        {local?.delivery === "failed" ? (
          <div className="flex items-center justify-end gap-3 bg-black/20 px-3.5 py-1.5 text-[11px]">
            <span>Not sent</span>
            <button type="button" onClick={() => onRetry(m)} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
              <RotateCw className="h-3 w-3" aria-hidden /> Retry
            </button>
            <button type="button" onClick={() => onDiscard(m)} className="opacity-80 hover:underline">Delete</button>
          </div>
        ) : null}
      </div>
      {seen && mine ? <span className="sr-only">Seen</span> : null}
    </div>
  );
}
