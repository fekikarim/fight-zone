import { createClient } from "@/lib/supabase/server";
import { businessDateKey } from "@/lib/timezone";
import { requireUser } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";
import { MotivationReplayButton } from "@/components/motivation/motivation-replay-button";

/**
 * "Today's round" — the day's corner-talk line kept on the dashboard as a
 * poster (server-rendered, read-only). It never generates: the line is
 * created by the corner talk on first visit of the day, after which the
 * gate refreshes the page so this card appears.
 */
export async function TodayMotivationCard() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_motivations")
    .select("quote, focus, category")
    .eq("user_id", user.id)
    .eq("motivation_date", businessDateKey())
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

  const category = data.category.charAt(0) + data.category.slice(1).toLowerCase();

  return (
    <section
      aria-labelledby="todays-round-h"
      className="relative overflow-hidden rounded-lg border border-ink-border bg-ink-soft"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
      <p
        aria-hidden
        className="pointer-events-none absolute -bottom-5 right-3 select-none font-display text-[clamp(4rem,12vw,8rem)] font-bold uppercase leading-none text-white/[0.035]"
      >
        {category}
      </p>
      <div className="relative flex flex-col gap-5 p-6 pl-8 sm:p-8 sm:pl-10">
        <div className="flex items-center justify-between gap-4">
          <h2 id="todays-round-h" className="type-overline flex items-center gap-2.5 text-[11px] text-muted">
            <span className="slant-bar h-1 w-4" aria-hidden />
            Corner talk · {category}
          </h2>
          <MotivationReplayButton />
        </div>
        <blockquote className="max-w-3xl font-display text-2xl font-bold uppercase leading-[1.05] tracking-tight text-balance sm:text-3xl lg:text-4xl">
          {data.quote}
        </blockquote>
        {data.focus ? (
          <p className="flex flex-wrap items-center gap-3">
            <span className="type-overline text-[10px] text-muted-foreground">Today&apos;s round</span>
            <span className="tag-slant text-sm font-semibold uppercase tracking-wide text-white">{data.focus}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
