import { Eye } from "lucide-react";
import { EnterPreviewButton } from "@/components/preview/enter-preview-button";
import type { PreviewReturn } from "@/lib/preview";

/**
 * "View as Member" entry banner for admin list pages (News, Events).
 * Designed to be unmissable without competing with the page's primary
 * actions: full-width gradient banner above the page header, own headline,
 * explicit read-only note, and a solid call-to-action. Stacks on mobile,
 * inline on larger screens.
 */
export function PreviewEntryBar({
  returnTo,
  subject,
}: {
  returnTo: PreviewReturn;
  subject: "articles" | "events";
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/[0.07] to-transparent px-5 py-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-transparent"
      />
      <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm shadow-primary/40">
            <Eye className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-white">
              View as Member
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary ring-1 ring-primary/30">
                Live preview
              </span>
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              See published {subject} exactly as members do. Preview is
              read-only — creating, editing and deleting stay here, in the
              admin area.
            </p>
          </div>
        </div>
        <div className="shrink-0 pl-15 sm:pl-0 [&_form]:w-full sm:[&_form]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          <EnterPreviewButton returnTo={returnTo} variant="primary" size="md" />
        </div>
      </div>
    </div>
  );
}
