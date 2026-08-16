import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { Database } from "@/types/database.types";

export type MemberSessionItem = Pick<
  Database["public"]["Tables"]["sessions"]["Row"],
  "id" | "title" | "description" | "type" | "duration_min" | "price" | "is_active"
>;

const sessionTypeLabel: Record<string, string> = {
  PERSONAL: "Personal",
  TECHNICAL: "Technical",
  PHYSICAL: "Physical",
  STRATEGY: "Strategy",
  COMBO: "Combo",
};

export function MemberSessionCard({ session }: { session: MemberSessionItem }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-ink-border transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <Badge variant="neutral">{sessionTypeLabel[session.type] ?? session.type}</Badge>
        <span className="font-display text-2xl font-bold text-primary">
          {formatPrice(Number(session.price))}
        </span>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-5 pt-0">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide">
          {session.title}
        </h3>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Clock className="h-4 w-4 text-primary" />
          {session.duration_min} minutes
        </p>
        {session.description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
            {session.description}
          </p>
        ) : null}
        <div className="mt-auto pt-4">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/member/sessions/${session.id}`}>
              View session
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MemberSessionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="h-5 w-20 skeleton rounded" />
        <div className="h-7 w-16 skeleton rounded" />
      </div>
      <CardContent className="flex flex-col gap-3 p-5 pt-0">
        <div className="h-5 w-3/4 skeleton rounded" />
        <div className="h-4 w-28 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-5/6 skeleton rounded" />
      </CardContent>
    </Card>
  );
}
