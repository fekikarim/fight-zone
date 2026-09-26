"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Live sync for a single event's participation surface. Refreshes server
 * data when any `event_participants` row for this event changes (joins,
 * cancellations, staff payment/attendance updates). Row-level security
 * scopes delivery: staff receive every change, members only their own —
 * aggregates for other members stay server-rendered, never streamed.
 *
 * Each mount uses its own channel (supabase-js reuses channel instances
 * by topic, so a shared name across simultaneous mounts throws when the
 * second .on() lands after subscribe). Subscription is best-effort and
 * can never crash the page.
 */
export function EventParticipantsRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`event-participants-${eventId}-${instanceId}`)
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
    } catch {
      channel = null;
    }
    return () => {
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch {
          // Cleanup must never throw.
        }
      }
    };
  }, [eventId, instanceId, router]);

  return null;
}
