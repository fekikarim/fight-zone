import Link from "next/link";
import { Star } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getAdminReviews } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ModerateReviewForm } from "@/components/reviews/moderate-review-form";
import { reviewStatusLabel, reviewTargetTypeLabel } from "@/lib/types/reviews";
import type { Database } from "@/types/database.types";

type ReviewStatus = Database["public"]["Enums"]["review_status"];

const statusFilters: { label: string; value: ReviewStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

interface AdminReviewsPageProps {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const status = params.status as ReviewStatus | "ALL" | undefined;
  const { items: reviews, nextCursor, hasMore } = await getAdminReviews({
    status: status && status !== "ALL" ? (status as ReviewStatus) : undefined,
    cursor: params.cursor,
    pageSize: 20,
  });

  const buildUrl = (newStatus?: string, cursor?: string) => {
    const sp = new URLSearchParams();
    if (newStatus && newStatus !== "ALL") sp.set("status", newStatus);
    if (cursor) sp.set("cursor", cursor);
    const qs = sp.toString();
    return `/admin/reviews${qs ? `?${qs}` : ""}`;
  };

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Review Moderation
        </h1>
        <p className="text-muted">
          Approve, reject, or feature member reviews.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.value}
            href={buildUrl(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              (status ?? "ALL") === f.value
                ? "bg-primary text-white"
                : "border border-ink-border bg-ink-soft/50 text-muted hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-ink-border bg-ink-soft/50 p-12 text-center">
          <Star className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">All caught up!</h2>
          <p className="mt-2 text-sm text-muted">
            No reviews matching this filter.
          </p>
        </div>
      ) : (
        <div className="[contain:inline-size] overflow-x-auto rounded-xl border border-ink-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-border bg-ink-soft/50 text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Featured</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  className="border-b border-ink-border/50 transition-colors last:border-0 hover:bg-ink-soft/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating
                              ? "fill-primary text-primary"
                              : "text-ink-border"
                          }`}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                    {review.title}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {review.member_profiles?.profiles?.full_name ?? "Anonymous"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral">
                      {reviewTargetTypeLabel[review.target_type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        review.status === "APPROVED"
                          ? "solid"
                          : review.status === "PENDING"
                            ? "default"
                            : "outline"
                      }
                    >
                      {reviewStatusLabel[review.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {review.is_featured ? (
                      <Star className="mx-auto h-4 w-4 fill-primary text-primary" />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ModerateReviewForm
                      reviewId={review.id}
                      currentStatus={review.status}
                      isFeatured={review.is_featured}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {hasMore && (
        <div className="flex justify-end">
          <Link
            href={buildUrl(status, nextCursor ?? undefined)}
            className="rounded-lg border border-ink-border bg-ink-soft/50 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/50 hover:text-foreground"
          >
            Next page →
          </Link>
        </div>
      )}
    </Container>
  );
}
