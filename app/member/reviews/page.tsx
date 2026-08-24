import Link from "next/link";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getMemberReviews } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { reviewStatusLabel, reviewTargetTypeLabel } from "@/lib/types/reviews";
import { formatDate } from "@/lib/utils";

export default async function MemberReviewsPage() {
  await requireUser();
  const reviews = await getMemberReviews();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="space-y-1">
        <Link
          href="/member"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          My Reviews
        </h1>
        <p className="text-muted">
          Reviews you have submitted across sessions, coaches, and the club.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-ink-border bg-ink-soft/50 p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">No reviews yet</h2>
          <p className="mt-2 text-sm text-muted">
            Complete a session to share your experience with the community.
          </p>
        </div>
      ) : (
        <div className="[contain:inline-size] overflow-x-auto rounded-xl border border-ink-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-border bg-ink-soft/50 text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
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
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-primary text-primary"
                              : "text-ink-border"
                          }`}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{review.title}</td>
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
                  <td className="px-4 py-3 text-muted">
                    {formatDate(review.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
