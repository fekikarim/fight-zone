import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { FIELD_BASE } from "@/components/ui/field-styles";
import { ChevronRight, Search, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getMembers } from "@/lib/members/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { UserAvatar } from "@/components/messages/user-avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { LiveForm } from "@/components/ui/live-form";

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
      <PageHeader eyebrow="Operate" title="Members" description={`${total} member${total === 1 ? "" : "s"} · profiles, registrations, payments and badges.`} />
      <LiveForm role="search" action="/admin/members" className="relative sm:max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="member-search" className="sr-only">Search members</label>
        <input id="member-search" name="q" type="search" defaultValue={q} placeholder="Name, email or phone"
          className={cn(FIELD_BASE, "h-12 rounded-full border-white/[0.08] pl-11")} />
      </LiveForm>
      {items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/members/${m.id}`} className="group flex h-full items-center gap-4 rounded-3xl border border-white/[0.06] bg-ink-soft p-4 transition-[transform,border-color,background-color] duration-200 hover:border-white/15 hover:bg-ink-softer active:scale-[0.99]">
                <UserAvatar name={m.full_name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-semibold uppercase leading-tight">{m.full_name ?? "Unnamed member"}</span>
                  <span className="block truncate text-xs text-muted">{m.email}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">Joined {formatDate(m.created_at, { month: "short", year: "numeric" })}{m.phone ? ` · ${m.phone}` : ""}</span>
                </span>
                
                {!m.is_active ? <Badge variant="danger" dot>Inactive</Badge> : null}
                <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Users />}
          title={q ? "No member matches" : "No members yet"}
          description={q ? "Try a name, an email address or a phone number." : "Members appear here as soon as they create an account."}
        />
      )}
      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {page > 1 ? <Button asChild variant="secondary" size="sm"><Link href={link(page - 1)}>Previous</Link></Button> : <span />}
          <span className="text-muted tabular">Page {page} of {pages}</span>
          {page < pages ? <Button asChild variant="secondary" size="sm"><Link href={link(page + 1)}>Next</Link></Button> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
