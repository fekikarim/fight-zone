import { Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { exitMemberPreview, isMemberPreview } from "@/lib/actions/preview";

/**
 * Light "previewing as a member" notice on public pages: a small floating
 * pill with an Exit link. Server-checked (cookie + staff role) on every
 * render; grants nothing.
 */
export async function PreviewModeBanner() {
  const [preview, user] = await Promise.all([isMemberPreview(), getCurrentUser()]);
  const staff = preview && (user?.roles.includes("ADMIN") || user?.roles.includes("COACH"));
  if (!staff) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <form action={exitMemberPreview}
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-ink-border bg-ink/90 py-1.5 pl-3 pr-1.5 text-xs text-muted shadow-lg backdrop-blur">
        <Eye className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span>Previewing as a member</span>
        <button type="submit" className="rounded-full bg-ink-soft px-3 py-1 font-medium text-foreground hover:bg-primary hover:text-white">
          Exit
        </button>
      </form>
    </div>
  );
}
