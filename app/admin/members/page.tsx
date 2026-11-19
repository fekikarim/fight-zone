import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getMembers } from "@/lib/members/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { UserAvatar } from "@/components/messages/user-avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };

const PAGE = 30;

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminMembersPage({ searchParams }: Props) {
  await requireRole(["ADMIN", "COACH"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await getMembers({ q, limit: PAGE, offset: (page - 1) * PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `/admin/members?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description={`${total} member${total === 1 ? "" : "s"}`} />
      <form role="search" className="relative sm:w-96">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="member-search" className="sr-only">Search members</label>
        <input id="member-search" name="q" defaultValue={q} placeholder="Name, email or phone…"
          className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft/40 pl-9 pr-3 text-base sm:text-sm" />
      </form>
      {items.length ? (
        <ul className="divide-y divide-ink-border overflow-hidden rounded-xl border border-ink-border">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-soft/40">
                <UserAvatar name={m.full_name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.full_name ?? "Unnamed member"}</span>
                  <span className="block truncate text-xs text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ""}</span>
                </span>
                <span className="hidden text-xs text-muted sm:inline">Joined {formatDate(m.created_at, { month: "short", year: "numeric" })}</span>
                {!m.is_active ? <Badge variant="outline">Inactive</Badge> : null}
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-border px-6 py-14 text-center">
          <Users className="h-9 w-9 text-primary" aria-hidden />
          <p className="text-sm text-muted">{q ? "No member matches your search." : "No members yet."}</p>
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="text-primary hover:underline">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="text-primary hover:underline">Next →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
