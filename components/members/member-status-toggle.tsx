"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setMemberActive } from "@/lib/actions/members";

/** Deactivate/reactivate a member (blocks new registrations; data is kept). */
export function MemberStatusToggle({ memberId, active }: { memberId: string; active: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const res = await setMemberActive(memberId, !active);
      if (!res.ok) return void toast.error(res.message ?? "That didn't work.");
      toast.success(active ? "Member deactivated" : "Member reactivated");
      setOpen(false);
      router.refresh();
    });
  return (
    <>
      <Button variant="outline" onClick={() => (active ? setOpen(true) : run())} disabled={pending}>
        {active ? "Deactivate" : "Reactivate"}
      </Button>
      <ConfirmDialog
        open={open}
        title="Deactivate this member?"
        description="They can still sign in and read their history, but can't register for new events until reactivated. Nothing is deleted."
        confirmLabel="Deactivate"
        pending={pending}
        onClose={() => !pending && setOpen(false)}
        onConfirm={run}
      />
    </>
  );
}
