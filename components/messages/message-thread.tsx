"use client";

import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Check, CheckCheck, ChevronLeft, Clock, FileText, Loader2, MessageCircle, Plus, RotateCw, ShieldCheck, X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { loadNewerMessages, loadOlderMessages, markConversationRead, sendMessage } from "@/lib/actions/messages";
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
  /** Chat header: subtitle, back link (phones; `backDesktop` keeps it on desktop) and actions. */
  header?: { subtitle?: ReactNode; backHref?: string; backDesktop?: boolean; actions?: ReactNode };
  /** Quick-start replies shown in an empty conversation (fill the composer). */
  suggestions?: string[];
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
export function MessageThread({ conversationId, memberId, currentUserId, initialMessages, hasMore, otherLabel, header, suggestions }: MessageThreadProps) {
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
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // Photos load after the first paint — stay pinned to the latest message.
    const onMediaLoad = () => { if (atBottomRef.current) el.scrollTop = el.scrollHeight; };
    el.addEventListener("load", onMediaLoad, true);
    return () => el.removeEventListener("load", onMediaLoad, true);
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
  const sameGroup = (a?: Msg, b?: Msg) =>
    !!a && !!b && a.kind === "USER" && b.kind === "USER" && a.sender_id === b.sender_id &&
    businessDateKey(a.created_at) === businessDateKey(b.created_at) &&
    Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 5 * 60_000;
  const canSend = !!body.trim() || !!file;
  const initials = otherLabel.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-ink lg:relative lg:inset-auto lg:z-auto lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/[0.08]">
      {/* Chat header */}
      <header className="relative z-10 flex items-center gap-3 border-b border-white/[0.06] bg-ink/85 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 lg:pt-3">
        {header?.backHref ? (
          <Link href={header.backHref} aria-label="Back" className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/[0.06]", header.backDesktop ? "" : "lg:hidden")}>
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </Link>
        ) : null}
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white">
          {initials || "?"}
          <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-ink", online ? "bg-success" : "bg-muted-foreground")} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold uppercase leading-tight tracking-tight">{otherLabel}</p>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {otherTyping ? <span className="font-semibold text-primary-readable">typing…</span> : header?.subtitle ?? "Private conversation"}
          </p>
        </div>
        {header?.actions ? <div className="flex shrink-0 items-center gap-1">{header.actions}</div> : null}
      </header>

      {!online ? (
        <p className="bg-warning-soft px-4 py-1.5 text-center text-xs text-warning" role="status">
          You&apos;re offline — messages will sync when you reconnect.
        </p>
      ) : null}

      {/* Timeline */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[radial-gradient(80%_50%_at_50%_0%,rgba(225,29,72,0.07),transparent_70%)] px-3 pb-4 pt-2 sm:px-6"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {moreAvailable ? (
          <button type="button" onClick={handleLoadOlder} disabled={loadingOlder}
            className="mx-auto my-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-ink-soft px-4 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60">
            {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {loadingOlder ? "Loading…" : "Earlier messages"}
          </button>
        ) : null}

        {messages.length ? (
          <div className="mt-auto flex flex-col">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || businessDateKey(prev.created_at) !== businessDateKey(m.created_at);
              return (
                <Fragment key={m.id}>
                  {newDay ? <DayDivider iso={m.created_at} /> : null}
                  {m.kind === "SYSTEM" ? (
                    <SystemNotice m={m} />
                  ) : (
                    <Bubble
                      m={m}
                      mine={m.sender_id === currentUserId}
                      first={!sameGroup(prev, m)}
                      last={!sameGroup(m, next)}
                      seen={m.id === lastSeenMine}
                      onOpenImage={setLightbox}
                      onRetry={retry}
                      onDiscard={discard}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div className="m-auto flex max-w-sm flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-display text-2xl font-bold text-white shadow-[var(--shadow-hit)]">
              {initials || <MessageCircle className="h-8 w-8" aria-hidden />}
            </span>
            <div>
              <p className="font-display text-2xl font-bold uppercase leading-tight">Say hi to {otherLabel}</p>
              <p className="mt-1.5 text-sm text-muted">Only the two of you can read this conversation.</p>
            </div>
            {suggestions?.length ? (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {suggestions.map((sug) => (
                  <button key={sug} type="button" onClick={() => { setBody(sug); inputRef.current?.focus(); }}
                    className="rounded-full border border-white/10 bg-ink-soft px-4 py-2 text-sm text-foreground/85 transition-colors hover:border-primary/50 hover:text-foreground active:scale-[0.97]">
                    {sug}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {otherTyping ? (
          <div className="mt-2 flex items-end gap-2" aria-hidden>
            <span className="inline-flex items-center gap-1 rounded-3xl rounded-bl-md bg-ink-softer px-4 py-3.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.24s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.12s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
            </span>
          </div>
        ) : null}
      </div>

      {unseenBelow > 0 ? (
        <button type="button" onClick={() => scrollToEnd(true)}
          className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-hit)] animate-[fz-fade-up_220ms_var(--ease-out)_both] lg:bottom-24">
          <ArrowDown className="h-3.5 w-3.5" aria-hidden /> {unseenBelow} new message{unseenBelow === 1 ? "" : "s"}
        </button>
      ) : null}

      {/* Composer */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        className="relative z-10 bg-gradient-to-t from-ink via-ink to-ink/0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 lg:pb-4">
        {file ? (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-soft p-2 pr-3 text-sm animate-[fz-fade-up_200ms_var(--ease-out)_both]">
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={filePreview} alt="" className="h-14 w-14 rounded-xl object-cover" />
            ) : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06]"><FileText className="h-6 w-6" aria-hidden /></span>}
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button type="button" onClick={clearFile} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white/[0.06] hover:text-foreground" aria-label="Remove attachment">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-[26px] border border-white/10 bg-ink-soft p-1.5 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] transition-colors focus-within:border-white/30 has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-primary-ring">
          <input ref={fileRef} type="file" accept={ATTACHMENT_MIME_TYPES.join(",")} className="sr-only" id={`attach-${channelId}`}
            onChange={(e) => pickFile(e.target.files?.[0])} />
          <label htmlFor={`attach-${channelId}`} title="Attach a photo or PDF" aria-label="Attach a photo or PDF"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground">
            <Plus className="h-5 w-5" aria-hidden />
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
            data-composer
            placeholder={`Message ${otherLabel.split(" ")[0]}`}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-base leading-snug placeholder:text-muted-foreground focus-visible:outline-none sm:text-[15px]"
          />
          <button type="submit" disabled={!canSend} aria-label="Send"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-90",
              canSend ? "scale-100 bg-primary text-white opacity-100 shadow-[var(--shadow-hit)]" : "scale-75 bg-white/10 text-muted opacity-60",
            )}>
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground lg:block">Enter to send · Shift+Enter for a new line · paste images directly</p>
      </form>

      {lightbox ? (
        <div role="dialog" aria-modal="true" aria-label="Image" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 animate-[fz-backdrop-in_200ms_ease-out_both]"
          onClick={() => setLightbox(null)} onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Close" autoFocus>
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-2xl object-contain animate-[fz-panel-in_260ms_var(--ease-out)_both]" />
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
  return (
    <div className="sticky top-1 z-[1] my-3 flex justify-center" role="separator">
      <span className="rounded-full border border-white/[0.06] bg-ink/80 px-3 py-1 text-[11px] font-semibold text-muted backdrop-blur-md">
        {relativeDayLabel(iso)}
      </span>
    </div>
  );
}

function SystemNotice({ m }: { m: Msg }) {
  return (
    <div className="mx-auto my-3 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-soft animate-[fz-fade-up_260ms_var(--ease-out)_both]">
      <p className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-white"><ShieldCheck className="h-3 w-3" aria-hidden /></span>
        Fight Zone · automatic
        <time className="ml-auto font-normal normal-case tracking-normal">{formatDate(m.created_at, { hour: "numeric", minute: "2-digit" })}</time>
      </p>
      <p className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed text-foreground/90">{m.body}</p>
    </div>
  );
}

function Bubble({ m, mine, first, last, seen, onOpenImage, onRetry, onDiscard }: {
  m: Msg; mine: boolean; first: boolean; last: boolean; seen: boolean;
  onOpenImage: (src: string) => void; onRetry: (m: Msg) => void; onDiscard: (m: Msg) => void;
}) {
  const local = m._local;
  const isImage = m.attachment_mime?.startsWith("image/");
  const src = local?.preview ?? (m.attachment_path ? `/api/message-attachments/${m.id}` : null);
  const autoCaption = m.body === "📷 Photo" || m.body === "📎 Document";
  const hasAttachment = !!(m.attachment_path || local?.file);
  const showText = !autoCaption || !hasAttachment;
  // iMessage-style corners: the side facing the sender tightens inside a run.
  const corners = mine
    ? cn("rounded-[22px]", !first && "rounded-tr-md", !last && "rounded-br-md", last && "rounded-br-sm")
    : cn("rounded-[22px]", !first && "rounded-tl-md", !last && "rounded-bl-md", last && "rounded-bl-sm");
  return (
    <div className={cn("flex flex-col animate-[fz-fade-up_220ms_var(--ease-out)_both]", mine ? "items-end" : "items-start", first ? "mt-3" : "mt-[3px]")}>
      <div className={cn(
        "max-w-[82%] overflow-hidden text-[15px] leading-snug sm:max-w-[65%]",
        corners,
        mine ? "bg-gradient-to-br from-primary to-primary-hover text-white" : "bg-ink-softer text-foreground",
        local?.delivery === "failed" && "opacity-70",
      )}>
        {hasAttachment && isImage && src ? (
          <button type="button" onClick={() => onOpenImage(src)} className="block w-full" aria-label="Open image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={m.attachment_name ?? "Photo"} loading="lazy" className="max-h-80 w-full object-cover" />
          </button>
        ) : null}
        {hasAttachment && !isImage ? (
          <a href={local ? undefined : `/api/message-attachments/${m.id}`} target="_blank" rel="noopener noreferrer"
            className={cn("m-1.5 flex items-center gap-3 rounded-2xl px-3 py-2.5", mine ? "bg-white/15" : "bg-white/[0.05]")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/20"><FileText className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{m.attachment_name ?? "Document"}</span>
              {m.attachment_size ? <span className="text-[11px] opacity-75">PDF · {Math.max(1, Math.round(m.attachment_size / 1024))} KB</span> : null}
            </span>
          </a>
        ) : null}
        {showText ? <p className="whitespace-pre-wrap break-words px-4 py-2.5">{m.body}</p> : null}
        {local?.delivery === "failed" ? (
          <div className="flex items-center justify-end gap-3 bg-black/25 px-4 py-1.5 text-[11px]">
            <span>Not sent</span>
            <button type="button" onClick={() => onRetry(m)} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
              <RotateCw className="h-3 w-3" aria-hidden /> Retry
            </button>
            <button type="button" onClick={() => onDiscard(m)} className="opacity-80 hover:underline">Delete</button>
          </div>
        ) : null}
      </div>
      {last ? (
        <span className="mt-1 flex items-center gap-1 px-2 text-[11px] text-muted-foreground">
          <time dateTime={m.created_at}>{formatDate(m.created_at, { hour: "numeric", minute: "2-digit" })}</time>
          {mine ? (
            local?.delivery === "sending" ? <><Clock className="h-3 w-3" aria-hidden /> Sending</> :
            local?.delivery === "failed" ? null :
            m.read_at ? <><CheckCheck className="h-3.5 w-3.5 text-info" aria-hidden />{seen ? " Seen" : ""}</> : <><Check className="h-3.5 w-3.5" aria-hidden /> Sent</>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
