import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { isRemoteImage } from "@/lib/events/images";
import type { Database } from "@/types/database.types";

export type AchievementItem = Pick<
  Database["public"]["Tables"]["achievements"]["Row"],
  "id" | "title" | "description" | "type" | "date" | "image_url"
>;

const achievementTypeLabel: Record<string, string> = {
  TITLE: "Title",
  TROPHY: "Trophy",
  MEDAL: "Medal",
  CERTIFICATE: "Certificate",
  RANKING: "Ranking",
};

/**
 * A palmares record: the year set large, a slanted type tag, the title.
 * Text-led so an entry without a picture is complete (no placeholder);
 * an uploaded picture shows as a duotone thumbnail.
 */
export function AchievementCard({ achievement }: { achievement: AchievementItem }) {
  const year = achievement.date ? new Date(achievement.date).getFullYear() : null;
  return (
    <article className="group lift relative flex h-full flex-col gap-5 overflow-hidden rounded-lg border border-ink-border bg-ink-soft p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="tag-slant text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            {achievementTypeLabel[achievement.type] ?? achievement.type}
          </span>
          {year ? (
            <p className="mt-4 font-display text-6xl font-bold leading-none text-ink-strong transition-colors duration-300 group-hover:text-foreground/25 tabular">
              {year}
            </p>
          ) : null}
        </div>
        {achievement.image_url ? (
          <div className="duotone relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-ink-border">
            <Image
              src={achievement.image_url}
              alt=""
              fill
              sizes="80px"
              unoptimized={isRemoteImage(achievement.image_url)}
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <h3 className="font-display text-xl font-semibold uppercase leading-tight">{achievement.title}</h3>
        {achievement.description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">{achievement.description}</p>
        ) : null}
        {achievement.date ? (
          <time dateTime={achievement.date} className="text-xs text-muted-foreground">
            {formatDate(achievement.date, { month: "long", day: "numeric", year: "numeric" })}
          </time>
        ) : null}
      </div>
    </article>
  );
}
