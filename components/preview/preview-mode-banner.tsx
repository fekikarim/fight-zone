import { Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { isMemberPreview } from "@/lib/actions/preview";
import { exitMemberPreview } from "@/lib/actions/preview";
import { Button } from "@/components/ui/button";

/**
 * "View as Member" mode banner for public pages. Renders only when the
 * request carries the preview cookie AND the viewer is staff — re-checked
 * server-side on every render, so it can neither leak to members nor
 * survive a role change. Grants nothing; all gates stay role-based.
 * Shares the entry banner's design language (gradient, accent edge,
 * solid CTA) so the two read as one system.
 */
export async function PreviewModeBanner() {
  const [preview, user] = await Promise.all([isMemberPreview(), getCurrentUser()]);
  const staff =
    preview &&
    (user?.roles.includes("ADMIN") || user?.roles.includes("COACH"));
  if (!staff) return null;

  return (
    <div role="status" className="border-b border-primary/25 bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/[0.07] to-transparent px-5 py-3.5 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-transparent"
          />
          <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm shadow-primary/40">
                <Eye className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white">
                  Viewing as a member
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary ring-1 ring-primary/30">
                    Preview mode
                  </span>
                </p>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted">
                  Browsing exactly as members do. Joining uses member accounts —
                  nothing here changes admin content.
                </p>
              </div>
            </div>
            <form action={exitMemberPreview} className="shrink-0">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full gap-1.5 sm:w-auto"
              >
                Exit preview · Back to admin
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
