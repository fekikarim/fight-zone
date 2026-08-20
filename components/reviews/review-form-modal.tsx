"use client";

import { useState, useActionState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/actions/reviews";
import type { ReviewActionState } from "@/lib/actions/reviews";

interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  targetType?: "COACH" | "SESSION" | "CLUB";
  coachId?: string;
  sessionId?: string;
  targetLabel?: string;
}

const initialState: ReviewActionState = { ok: false };

export function ReviewFormModal({
  open,
  onClose,
  targetType = "CLUB",
  coachId,
  sessionId,
  targetLabel,
}: ReviewFormModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [state, formAction, isPending] = useActionState(submitReview, initialState);

  if (!open) return null;

  const displayRating = hoveredStar || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Leave a review"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-ink-border bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-tight">
              Leave a Review
            </h2>
            {targetLabel && (
              <p className="mt-1 text-sm text-muted">{targetLabel}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.ok ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <p className="text-lg font-semibold">Thank you!</p>
            <p className="mt-1 text-sm text-muted">{state.message}</p>
            <Button onClick={onClose} variant="outline" className="mt-6">
              Close
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="rating" value={rating} />
            <input type="hidden" name="targetType" value={targetType} />
            {coachId && <input type="hidden" name="coachId" value={coachId} />}
            {sessionId && (
              <input type="hidden" name="sessionId" value={sessionId} />
            )}

            {/* Star rating */}
            <div>
              <label className="mb-2 block text-sm font-medium">Your rating</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoveredStar(starValue)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                      aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          starValue <= displayRating
                            ? "fill-primary text-primary"
                            : "text-ink-border"
                        }`}
                      />
                    </button>
                  );
                })}
                {displayRating > 0 && (
                  <span className="ml-2 text-sm text-muted">
                    {displayRating}/5
                  </span>
                )}
              </div>
              {rating === 0 && !state.ok && (
                <p className="mt-1 text-xs text-muted">Select a rating from 1 to 5</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium">
                Title
              </label>
              <input
                id="review-title"
                name="title"
                type="text"
                required
                minLength={3}
                maxLength={200}
                placeholder="Summarize your experience"
                className="w-full rounded-lg border border-ink-border bg-ink-soft/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="review-content" className="mb-1.5 block text-sm font-medium">
                Your experience
              </label>
              <textarea
                id="review-content"
                name="content"
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                placeholder="Tell us about your experience..."
                className="w-full resize-none rounded-lg border border-ink-border bg-ink-soft/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {state.message && !state.ok && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {state.message}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || rating === 0}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
