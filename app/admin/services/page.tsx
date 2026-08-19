import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminSessions } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/utils";
import { sessionTypeLabel, disciplineLabel, skillLevelLabel } from "@/lib/types/services";
import type { Discipline } from "@/lib/types/services";

export const metadata: Metadata = {
  title: "Manage Services",
  description: "Create and manage coaching sessions and programs.",
};

type SessionRow = Awaited<ReturnType<typeof getAdminSessions>>[number];
type SessionWithMeta = SessionRow & { discipline?: string | null; level?: string | null };

export default async function AdminServicesPage() {
  const rawSessions = await getAdminSessions();
  const sessions = rawSessions as SessionWithMeta[];

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Services
          </h1>
          <p className="text-sm text-muted">
            Manage coaching sessions and programs.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/services/new">
            <Plus className="mr-2 h-4 w-4" />
            New session
          </Link>
        </Button>
      </div>

      {sessions.length > 0 ? (
        <div className="divide-y divide-ink-border rounded-xl border border-ink-border">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/admin/services/${session.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-ink-soft/40"
            >
              <Dumbbell className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session.title}</p>
                <p className="text-xs text-muted">
                  {sessionTypeLabel[session.type] ?? session.type}
                  {session.discipline ? ` · ${disciplineLabel[session.discipline as Discipline] ?? session.discipline}` : ""}
                  {session.level ? ` · ${skillLevelLabel[session.level] ?? session.level}` : ""}
                </p>
              </div>
              <span className="text-xs font-medium text-primary">
                {formatPrice(Number(session.price))}
              </span>
              <Badge variant={session.is_active ? "default" : "outline"} className="shrink-0">
                {session.is_active ? "Active" : "Inactive"}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
          <Dumbbell className="h-10 w-10 text-primary" />
          <p className="text-muted">No sessions yet — create your first session to get started.</p>
          <Button asChild>
            <Link href="/admin/services/new">
              <Plus className="mr-2 h-4 w-4" />
              New session
            </Link>
          </Button>
        </div>
      )}
    </Container>
  );
}
