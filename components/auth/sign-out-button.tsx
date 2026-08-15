"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function SignOutButtonContent() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Spinner size="sm" /> : <LogOut className="h-4 w-4" />}
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

/** Sign-out form with a pending state that prevents duplicate submissions. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <SignOutButtonContent />
    </form>
  );
}
