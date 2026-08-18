"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadMoreNotificationsProps {
  nextCursor: string | null;
  isLoading?: boolean;
}

export function LoadMoreNotifications({
  nextCursor,
  isLoading = false,
}: LoadMoreNotificationsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!nextCursor) return null;

  const cursor = nextCursor;

  function loadMore() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", cursor);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={loadMore}
      disabled={isLoading}
      className="mx-auto mt-2 gap-1.5"
    >
      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {isLoading ? "Loading…" : "Load older notifications"}
    </Button>
  );
}
