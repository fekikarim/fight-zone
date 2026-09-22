import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { businessDateKey } from "@/lib/timezone";
import { requireUser } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";

/**
 * "Today's Motivation" dashboard card (server-rendered, read-only).
 * Shows today's stored quote when it already exists (created by the daily
 * dialog on first access). It never generates — that is the dialog/server
 * action's job — so a member who has not yet opened their motivation today
 * simply sees no card until the dialog has created today's row.
 */
export async function TodayMotivationCard() {
  const user = await requireUser();
  const motivationDate = businessDateKey();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_motivations")
    .select("quote, focus, category, source")
    .eq("user_id", user.id)
    .eq("motivation_date", motivationDate)
    .maybeSingle();

  if (error) {
    logError("Failed to load today's motivation card", error, {
      domain: "motivation",
      op: "TodayMotivationCard",
      userId: user.id,
    });
    return null;
  }

  if (!data) return null;

  const category =
    data.category.charAt(0) + data.category.slice(1).toLowerCase();

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/20"
      style={{
        background:
          "radial-gradient(ellipse 80% 80% at 0% 50%, rgba(225,29,72,0.13) 0%, rgba(17,17,19,0.95) 60%)",
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--ink-border) 1px, transparent 1px), linear-gradient(90deg, var(--ink-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-3 p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
              Today&apos;s Motivation
            </h2>
          </div>
          {/* Category badge */}
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            {category}
          </span>
        </div>

        {/* Quote */}
        <blockquote className="font-display text-lg font-bold uppercase leading-snug tracking-tight text-white">
          {data.quote}
        </blockquote>

        {/* Focus sub-text */}
        {data.focus ? (
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {data.focus}
          </p>
        ) : null}
      </div>
    </section>
  );
}
