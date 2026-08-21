"use client";

import { useActionState } from "react";
import { Eye, EyeOff, Star, Loader2 } from "lucide-react";
import { moderateTransformation } from "@/lib/actions/reviews";
import type { ReviewActionState } from "@/lib/actions/reviews";

const initialState: ReviewActionState = { ok: false };

interface ModerateTransformationFormProps {
  transformationId: string;
  isPublished: boolean;
  isFeatured: boolean;
}

export function ModerateTransformationForm({
  transformationId,
  isPublished,
  isFeatured,
}: ModerateTransformationFormProps) {
  return (
    <div className="flex items-center gap-1">
      <PublishButton transformationId={transformationId} isPublished={isPublished} />
      <FeatureButton transformationId={transformationId} isFeatured={isFeatured} />
    </div>
  );
}

function PublishButton({
  transformationId,
  isPublished,
}: {
  transformationId: string;
  isPublished: boolean;
}) {
  const [, formAction, isPending] = useActionState(moderateTransformation, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="transformationId" value={transformationId} />
      <input
        type="hidden"
        name="isPublished"
        value={isPublished ? "false" : "true"}
      />
      <button
        type="submit"
        disabled={isPending}
        aria-label={isPublished ? "Unpublish transformation" : "Publish transformation"}
        className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
          isPublished
            ? "text-green-400 hover:bg-green-500/10"
            : "text-muted hover:bg-ink-soft"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPublished ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}

function FeatureButton({
  transformationId,
  isFeatured,
}: {
  transformationId: string;
  isFeatured: boolean;
}) {
  const [, formAction, isPending] = useActionState(moderateTransformation, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="transformationId" value={transformationId} />
      <input
        type="hidden"
        name="isFeatured"
        value={isFeatured ? "false" : "true"}
      />
      <button
        type="submit"
        disabled={isPending}
        aria-label={isFeatured ? "Unfeature transformation" : "Feature transformation on home page"}
        className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
          isFeatured
            ? "text-primary hover:bg-primary/10"
            : "text-muted hover:bg-ink-soft"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Star className={`h-4 w-4 ${isFeatured ? "fill-primary" : ""}`} />
        )}
      </button>
    </form>
  );
}
