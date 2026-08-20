import { requireRole } from "@/lib/auth/guards";
import { getAdminTransformations } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ModerateTransformationForm } from "@/components/reviews/moderate-transformation-form";
import { computeWeightChange } from "@/lib/types/reviews";
import { formatDate } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface AdminTransformationsPageProps {
  searchParams: Promise<{ cursor?: string }>;
}

export default async function AdminTransformationsPage({
  searchParams,
}: AdminTransformationsPageProps) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { items: transformations, nextCursor, hasMore } = await getAdminTransformations({
    cursor: params.cursor,
    pageSize: 20,
  });

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Transformation Stories
        </h1>
        <p className="text-muted">
          Manage Before/After transformation stories.
        </p>
      </div>

      {transformations.length === 0 ? (
        <div className="rounded-2xl border border-ink-border bg-ink-soft/50 p-12 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">No transformations yet</h2>
          <p className="mt-2 text-sm text-muted">
            Member transformation stories will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transformations.map((t) => {
            const weightChange = computeWeightChange(
              t.starting_weight,
              t.current_weight,
            );
            return (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-ink-border bg-ink-soft/50 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1 bg-ink p-1">
                  <div className="flex flex-col items-center rounded bg-ink-soft/30 p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Before
                    </span>
                    {t.starting_weight != null && (
                      <span className="mt-1 text-sm font-bold">
                        {t.starting_weight} kg
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center rounded bg-ink-soft/30 p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      After
                    </span>
                    {t.current_weight != null && (
                      <span className="mt-1 text-sm font-bold text-primary">
                        {t.current_weight} kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold leading-tight">{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {t.story}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {weightChange != null && (
                      <Badge variant="default">
                        {weightChange > 0 ? "+" : ""}
                        {weightChange} kg
                      </Badge>
                    )}
                    {t.timeframe_months != null && (
                      <Badge variant="neutral">
                        {t.timeframe_months} months
                      </Badge>
                    )}
                    {t.discipline && (
                      <Badge variant="outline">{t.discipline}</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-ink-border/50 pt-3">
                    <span className="text-xs text-muted">
                      {formatDate(t.created_at)}
                    </span>
                    <ModerateTransformationForm
                      transformationId={t.id}
                      isPublished={t.is_published}
                      isFeatured={t.is_featured}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-end">
          <a
            href={`/admin/reviews/transformations?cursor=${nextCursor}`}
            className="rounded-lg border border-ink-border bg-ink-soft/50 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/50 hover:text-foreground"
          >
            Next page →
          </a>
        </div>
      )}
    </Container>
  );
}
