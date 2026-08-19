import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database.types";

export type EventItem = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "description" | "start_at" | "end_at" | "location" | "event_type"
>;

const eventTypeLabel: Record<string, string> = {
  TRAINING: "Training",
  WORKSHOP: "Workshop",
  COMPETITION: "Competition",
  SEMINAR: "Seminar",
  OTHER: "Event",
};

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="flex h-full flex-col gap-4 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="neutral">{eventTypeLabel[event.event_type] ?? event.event_type}</Badge>
          <span className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
            {formatDate(event.start_at, { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
        <CardTitle className="text-lg">{event.title}</CardTitle>
        {event.description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">{event.description}</p>
        ) : null}
        <CardContent className="flex flex-col gap-2 p-0 pt-0">
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDate(event.start_at, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
          {event.end_at ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4 text-primary" />
              Ends {formatDate(event.end_at, { hour: "numeric", minute: "2-digit" })}
            </span>
          ) : null}
        {event.location ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <MapPin className="h-4 w-4 text-primary" />
            {event.location}
          </span>
        ) : null}
      </CardContent>
      </Card>
    </Link>
  );
}
