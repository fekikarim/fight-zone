"use client";

import { useActionState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { NotificationActionState } from "@/lib/actions/notifications";

const INITIAL: NotificationActionState = { ok: false };

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(
    async () => markAllNotificationsRead(),
    INITIAL,
  );

  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={disabled || isPending}
        className="gap-1.5 text-xs text-muted hover:text-foreground"
      >
        <CheckCheck className="h-3.5 w-3.5" />
        {isPending ? "Marking…" : state.ok && state.affected === 0 ? "All caught up" : "Mark all as read"}
      </Button>
    </form>
  );
}
