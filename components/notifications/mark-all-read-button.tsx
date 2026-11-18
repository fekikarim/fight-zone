"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runActionWithToast } from "@/components/ui/form-feedback";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { NotificationActionState } from "@/lib/actions/notifications";

const INITIAL: NotificationActionState = { ok: false };

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async () => {
      const result = await runActionWithToast(() => markAllNotificationsRead(), {
        success: (r) => (r.affected ? "All notifications marked as read" : undefined),
      });
      if (result.ok) router.refresh();
      return result;
    },
    INITIAL,
  );

  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={disabled || isPending}
        className="h-9 shrink-0 gap-1.5 self-start text-xs text-muted hover:text-foreground sm:self-auto"
      >
        <CheckCheck className="h-3.5 w-3.5" />
        {isPending ? "Marking…" : state.ok && state.affected === 0 ? "All caught up" : "Mark all as read"}
      </Button>
    </form>
  );
}
