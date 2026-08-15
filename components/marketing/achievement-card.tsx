import Image from "next/image";
import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { formatDate } from "@/lib/utils";
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

export function AchievementCard({ achievement }: { achievement: AchievementItem }) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-softer">
        {achievement.image_url ? (
          <Image
            src={achievement.image_url}
            alt={achievement.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PlaceholderImage label="Achievement image" className="h-full rounded-none border-0" />
        )}
        <div className="absolute left-3 top-3">
          <Badge variant="solid">
            <Trophy className="h-3 w-3" />
            {achievementTypeLabel[achievement.type] ?? achievement.type}
          </Badge>
        </div>
      </div>
      <CardContent className="flex flex-col gap-2 p-5">
        <CardTitle className="text-base">{achievement.title}</CardTitle>
        {achievement.description ? (
          <CardDescription className="line-clamp-2">{achievement.description}</CardDescription>
        ) : null}
        {achievement.date ? (
          <span className="mt-auto text-xs font-semibold uppercase tracking-widest text-primary">
            {formatDate(achievement.date)}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
