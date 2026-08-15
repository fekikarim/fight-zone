import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  description: "Fight Zone admin dashboard.",
};

export default async function AdminPage() {
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const [{ count: messages }, { count: bookings }, { count: activeSessions }] =
    await Promise.all([
      supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "UNREAD"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("sessions").select("*", { count: "exact", head: true }).eq("is_active", true),
    ]);

  const cards = [
    { label: "Unread messages", value: messages ?? 0 },
    { label: "Pending bookings", value: bookings ?? 0 },
    { label: "Active sessions", value: activeSessions ?? 0 },
  ];

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Admin overview
          </h1>
          {user.roles.map((role) => (
            <Badge key={role} variant="neutral">
              {role}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted">
          Manage bookings, messages and content from this dashboard.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-ink-border bg-ink-soft/50 p-6"
          >
            <p className="font-display text-4xl font-bold text-primary">{card.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-10 text-center text-sm text-muted">
        The admin area is a placeholder — bookings, messages and content
        management modules come next.
      </p>
    </Container>
  );
}
