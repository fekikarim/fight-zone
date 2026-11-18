"use client";

import { useActionState } from "react";
import { runActionWithToast } from "@/components/ui/form-feedback";
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
  const [state, formAction, isPending] = useActionState(
    (prev: ReviewActionState, fd: FormData) => runActionWithToast(() => moderateReview(prev, fd)),
    initialModerateState);
  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value="APPROVED" />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Approve review"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1.5 text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      {!state.ok && state.message ? (
        <p role="alert" className="mt-1 max-w-40 text-[11px] leading-tight text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function RejectButton({ reviewId }: { reviewId: string }) {
  const [state, formAction, isPending] = useActionState(
    (prev: ReviewActionState, fd: FormData) => runActionWithToast(() => moderateReview(prev, fd)),
    initialModerateState);
  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value="REJECTED" />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Reject review"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
      {!state.ok && state.message ? (
        <p role="alert" className="mt-1 max-w-40 text-[11px] leading-tight text-red-400">
          {state.message}
        </p>
      ) : null}
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
  const [state, formAction, isPending] = useActionState(
    (prev: ReviewActionState, fd: FormData) => runActionWithToast(() => toggleReviewFeatured(prev, fd)),
    initialFeatureState);
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
        aria-label={isFeatured ? "Unfeature review" : "Feature review on home page"}
        className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
          isFeatured
            ? "text-primary hover:bg-primary/10"
            : "text-muted hover:bg-ink-soft"
        }`}
      >
        <Star
          className={`h-4 w-4 ${isFeatured ? "fill-primary" : ""}`}
        />
      </button>
      {!state.ok && state.message ? (
        <p role="alert" className="mt-1 max-w-40 text-[11px] leading-tight text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
