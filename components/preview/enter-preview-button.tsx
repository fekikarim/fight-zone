import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enterMemberPreview } from "@/lib/actions/preview";
import type { PreviewReturn } from "@/lib/preview";

/**
 * Staff-only "View as Member" entry. Posts to the role-gated server action,
 * which sets the preview cookie and redirects to the public page. Rendered
 * on admin list pages (overview, events, news).
 */
export function EnterPreviewButton({
  returnTo,
  label = "View as Member",
  variant = "outline",
  size = "sm",
}: {
  returnTo: PreviewReturn;
  label?: string;
  variant?: "outline" | "primary";
  size?: "sm" | "md";
}) {
  return (
    <form action={enterMemberPreview}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant={variant} size={size} className="gap-2">
        <Eye className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    </form>
  );
}
