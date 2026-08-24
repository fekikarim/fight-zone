import { classifyError } from "@/lib/errors";

/**
 * Client-side structured boundary log. Browser console channel only —
 * server-side failures are logged once on the server with the same digest
 * for correlation. Never includes component state or raw payloads.
 */
export function logBoundaryError(scope: string, error: Error & { digest?: string }) {
  const { category, dbCode } = classifyError(error);
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: "error",
    domain: "boundary",
    op: scope,
    msg: "Route error boundary caught",
    category,
    digest: error.digest,
  };
  if (dbCode) record.dbCode = dbCode;
  console.error(`[fight-zone] ${JSON.stringify(record)}`);
}
