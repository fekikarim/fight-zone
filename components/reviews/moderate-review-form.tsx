"use client";

import { useActionState } from "react";
import { Check, X, Star, Loader2 } from "lucide-react";
import { moderateReview, toggleReviewFeatured } from "@/lib/actions/reviews";
import type { ReviewActionState } from "@/lib/actions/reviews";

const initialModerateState: ReviewActionState = { ok: false };
const initialFeatureState: ReviewActionState = { ok: false };

interface ModerateReviewFormProps {
  reviewId: string;
  currentStatus: string;
  isFeatured: boolean;
}

export function ModerateReviewForm({
  reviewId,
  currentStatus,
  isFeatured,
}: ModerateReviewFormProps) {
  return (
    <div className="flex items-center gap-1">
      {currentStatus !== "APPROVED" && (
        <ApproveButton reviewId={reviewId} />
      )}
      {currentStatus !== "REJECTED" && (
        <RejectButton reviewId={reviewId} />
      )}
      <FeatureButton reviewId={reviewId} isFeatured={isFeatured} />
    </div>
  );
}

function ApproveButton({ reviewId }: { reviewId: string }) {
  const [, formAction, isPending] = useActionState(moderateReview, initialModerateState);
  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value="APPROVED" />
      <button
        type="submit"
        disabled={isPending}
        className="rounded p-1.5 text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-50"
        title="Approve"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
    </form>
  );
}

function RejectButton({ reviewId }: { reviewId: string }) {
  const [, formAction, isPending] = useActionState(moderateReview, initialModerateState);
  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value="REJECTED" />
      <button
        type="submit"
        disabled={isPending}
        className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        title="Reject"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
    </form>
  );
}

function FeatureButton({
  reviewId,
  isFeatured,
}: {
  reviewId: string;
  isFeatured: boolean;
}) {
  const [, formAction, isPending] = useActionState(toggleReviewFeatured, initialFeatureState);
  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input
        type="hidden"
        name="isFeatured"
        value={isFeatured ? "false" : "true"}
      />
      <button
        type="submit"
        disabled={isPending}
        className={`rounded p-1.5 transition-colors disabled:opacity-50 ${
          isFeatured
            ? "text-primary hover:bg-primary/10"
            : "text-muted hover:bg-ink-soft"
        }`}
        title={isFeatured ? "Unfeature" : "Feature on home"}
      >
        <Star
          className={`h-4 w-4 ${isFeatured ? "fill-primary" : ""}`}
        />
      </button>
    </form>
  );
}
