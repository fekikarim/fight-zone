"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setContactStatus } from "@/lib/actions/site-content";
import { formatDate } from "@/lib/utils";

export interface ContactRow { id: string; name: string; email: string; subject: string; message: string; category: string; status: "UNREAD" | "READ" | "REPLIED"; created_at: string }

const CAT: Record<string, string> = { GENERAL: "General", EVENTS: "Events", PAYMENT: "Payment", COACHING: "Coaching", OTHER: "Other" };

export function ContactInbox({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (id: string, s: ContactRow["status"]) => start(async () => {
    const r = await setContactStatus(id, s);
    if (!r.ok) return void toast.error(r.message ?? "That didn't work.");
    toast.success(r.message ?? "Updated");
    router.refresh();
  });
  if (!rows.length) return <p className="rounded-xl border border-dashed border-ink-border px-4 py-10 text-center text-sm text-muted">No messages here.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className={`rounded-xl border p-4 ${r.status === "UNREAD" ? "border-primary/40 bg-primary-soft/20" : "border-ink-border bg-ink-soft/30"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{r.subject}</p>
            <time className="text-xs text-muted">{formatDate(r.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
          </div>
          <p className="text-xs text-muted">{r.name} · {r.email} · <Badge variant="neutral">{CAT[r.category] ?? r.category}</Badge></p>
          <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground/85">{r.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1.5" onClick={() => r.status === "UNREAD" && set(r.id, "READ")}>
              <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}><Mail className="h-4 w-4" aria-hidden /> Reply by email</a>
            </Button>
            {r.status !== "REPLIED" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => set(r.id, "REPLIED")}>Mark replied</Button> : null}
            {r.status === "UNREAD" ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => set(r.id, "READ")}>Mark read</Button>
              : <Button size="sm" variant="ghost" disabled={pending} onClick={() => set(r.id, "UNREAD")}>Mark as new</Button>}
          </div>
        </li>
      ))}
    </ul>
  );
}
