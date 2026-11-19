import { EnterPreviewButton } from "@/components/preview/enter-preview-button";
import type { PreviewReturn } from "@/lib/preview";

/**
 * Discreet "Preview as member" link for admin list pages (News, Events):
 * one quiet line instead of a banner, so it never competes with the page.
 */
export function PreviewEntryBar({ returnTo, subject }: { returnTo: PreviewReturn; subject: "articles" | "events" }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
      <span className="hidden sm:inline">See published {subject} as members do:</span>
      <EnterPreviewButton returnTo={returnTo} variant="outline" size="sm" label="Preview as member" />
    </div>
  );
}
