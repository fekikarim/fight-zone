import "server-only";

import { headers } from "next/headers";
import { setCorrelationLoader } from "@/lib/errors";

/**
 * Registers the per-request correlation provider used by the structured
 * logger. The proxy (proxy.ts) mints/forwards `x-request-id`; here we read
 * it back inside RSC/action scope. Best effort: never throws, never blocks.
 */
export function registerObservability() {
  setCorrelationLoader(async () => {
    try {
      const h = await headers();
      const requestId = h.get("x-request-id") ?? undefined;
      const rawPath = h.get("x-matched-path") ?? h.get("x-invoke-path");
      return { requestId, route: rawPath ?? undefined };
    } catch {
      return {};
    }
  });
}
