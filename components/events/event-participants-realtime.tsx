"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Live sync for a single event's participation surface. Refreshes server
 * data when any `event_participants` row for this event changes (joins,
 * cancellations, staff payment/attendance updates). Row-level security
 * scopes delivery: staff receive every change, members only their own —
 * aggregates for other members stay server-rendered, never streamed.
 */
export function EventParticipantsRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-participants-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  return null;
}
