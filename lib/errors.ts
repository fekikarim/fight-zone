import { ZodError } from "zod";

/**
 * Typed application error hierarchy + structured observability core.
 * The foundation guarantees:
 *  - predictable, typed failures
 *  - no raw database/Supabase errors surfaced to users
 *  - consistent user-safe messages
 *  - server-side structured logging without leaking secrets
 *
 * Log contract (Phase 17):
 *  - single-line JSON after a stable `[fight-zone] ` prefix
 *  - operation/domain, severity, stable category, PostgREST/SQLSTATE code,
 *    safe route + request correlation where supported, timing when measured
 *  - secrets/tokens/credentials/raw payloads are redacted defensively
 *  - one underlying failure produces ONE actionable log (dedup registry)
 */

export type AppErrorCode =
  | "VALIDATION"
  | "AUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DATABASE"
  | "UNKNOWN";

/** Stable machine-readable failure categories for alerting/triage. */
export type ErrorCategory =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DB_CONSTRAINT"
  | "DB_PERMISSION"
  | "SCHEMA_MISSING"
  | "TIMEOUT"
  | "CONNECTIVITY"
  | "RATE_LIMIT"
  | "UNKNOWN";

export type LogLevel = "warn" | "error";

export interface AppErrorOptions {
  /** Optional user-safe message (never raw internal details). */
  userMessage?: string;
  status?: number;
  cause?: unknown;
  /** Extra context for server-side logs. */
  context?: Record<string, unknown>;
}

const USER_FALLBACK = "Something went wrong. Please try again.";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? statusForCode(code);
    this.userMessage = options.userMessage ?? USER_FALLBACK;
    this.context = options.context;
    this.cause = options.cause;
  }

  toJSON() {
    return {
      code: this.code,
      status: this.status,
      message: this.userMessage,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the submitted information.", options: AppErrorOptions = {}) {
    super("VALIDATION", message, { ...options, status: 400 });
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "You need to sign in to continue.", options: AppErrorOptions = {}) {
    super("AUTH", message, { ...options, status: 401 });
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this.", options: AppErrorOptions = {}) {
    super("FORBIDDEN", message, { ...options, status: 403 });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource could not be found.", options: AppErrorOptions = {}) {
    super("NOT_FOUND", message, { ...options, status: 404 });
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends AppError {
  constructor(message = "The database request could not be completed.", options: AppErrorOptions = {}) {
    super("DATABASE", message, { ...options, status: 500 });
    this.name = "DatabaseError";
  }
}

function statusForCode(code: AppErrorCode): number {
  switch (code) {
    case "VALIDATION":
      return 400;
    case "AUTH":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

const SQLSTATE_CATEGORY: Record<string, ErrorCategory> = {
  "23000": "DB_CONSTRAINT",
  "23502": "DB_CONSTRAINT",
  "23503": "DB_CONSTRAINT",
  "23505": "CONFLICT",
  "23514": "DB_CONSTRAINT",
  "23P01": "DB_CONSTRAINT",
  "28000": "AUTHENTICATION",
  "28P01": "AUTHENTICATION",
  "3D000": "SCHEMA_MISSING",
  "3F000": "SCHEMA_MISSING",
  "40001": "CONFLICT",
  "40P01": "CONFLICT",
  "42501": "DB_PERMISSION",
  "42704": "SCHEMA_MISSING",
  "42P01": "SCHEMA_MISSING",
  "42883": "SCHEMA_MISSING",
  "53300": "RATE_LIMIT",
  "53400": "RATE_LIMIT",
  "55P03": "TIMEOUT",
  "57014": "TIMEOUT",
  "57P05": "CONNECTIVITY",
};

const POSTGREST_CATEGORY: Record<string, ErrorCategory> = {
  PGRST100: "VALIDATION",
  PGRST103: "RATE_LIMIT",
  PGRST105: "DB_PERMISSION",
  PGRST106: "AUTHENTICATION",
  PGRST109: "AUTHORIZATION",
  PGRST116: "NOT_FOUND",
  PGRST301: "TIMEOUT",
};

/** Supabase Auth (GoTrue) error codes — snake_case strings, not SQLSTATEs. */
const GOTRUE_CATEGORY: Record<string, ErrorCategory> = {
  bad_jwt: "AUTHENTICATION",
  invalid_credentials: "AUTHENTICATION",
  otp_expired: "AUTHENTICATION",
  refresh_token_not_found: "AUTHENTICATION",
  refresh_token_already_used: "AUTHENTICATION",
  session_expired: "AUTHENTICATION",
  session_not_found: "AUTHENTICATION",
  user_banned: "AUTHENTICATION",
  user_not_found: "AUTHENTICATION",
  anonymous_provider_disabled: "AUTHENTICATION",
  email_conflict_identity_not_deletable: "CONFLICT",
  over_email_send_rate_limit: "RATE_LIMIT",
  over_request_rate_limit: "RATE_LIMIT",
  over_sms_send_rate_limit: "RATE_LIMIT",
  weak_password: "VALIDATION",
  validation_failed: "VALIDATION",
  signup_disabled: "AUTHORIZATION",
  insufficient_scope: "AUTHORIZATION",
};

const APPCODE_CATEGORY: Record<AppErrorCode, ErrorCategory> = {
  VALIDATION: "VALIDATION",
  AUTH: "AUTHENTICATION",
  FORBIDDEN: "AUTHORIZATION",
  NOT_FOUND: "NOT_FOUND",
  DATABASE: "UNKNOWN",
  UNKNOWN: "UNKNOWN",
};

export interface Classification {
  category: ErrorCategory;
  dbCode?: string;
}

/** Maps any thrown value onto a stable category + db code when present. */
export function classifyError(error: unknown): Classification {
  if (error instanceof ZodError) return { category: "VALIDATION" };
  if (error instanceof AppError) {
    const base: Classification = { category: APPCODE_CATEGORY[error.code] };
    const inner = classifyCause(error.cause);
    return inner.dbCode ? { category: base.category === "UNKNOWN" ? inner.category : base.category, dbCode: inner.dbCode } : base;
  }
  return classifyCause(error);
}

function classifyCause(cause: unknown): Classification {
  if (cause === undefined || cause === null) return { category: "UNKNOWN" };
  if (cause instanceof ZodError) return { category: "VALIDATION" };
  if (typeof cause === "object") {
    const obj = cause as Record<string, unknown>;
    if (typeof obj.code === "string") {
      const code = obj.code;
      if (SQLSTATE_CATEGORY[code]) return { category: SQLSTATE_CATEGORY[code], dbCode: code };
      if (POSTGREST_CATEGORY[code]) return { category: POSTGREST_CATEGORY[code], dbCode: code };
      if (GOTRUE_CATEGORY[code]) return { category: GOTRUE_CATEGORY[code], dbCode: code };
    }
    if (typeof obj.message === "string") {
      const m = obj.message.toLowerCase();
      if (m.includes("fetch failed") || m.includes("econnrefused") || m.includes("enotfound") || m.includes("econnreset") || m.includes("socket hang up")) {
        return { category: "CONNECTIVITY" };
      }
      if (m.includes("timeout") || m.includes("etimedout") || m.includes("aborted")) {
        return { category: "TIMEOUT" };
      }
    }
    if (obj.cause) return classifyCause(obj.cause);
  }
  if (cause instanceof Error) {
    const msg = cause.message.toLowerCase();
    if (msg.includes("fetch failed") || msg.includes("econnrefused") || msg.includes("enotfound") || msg.includes("econnreset")) {
      return { category: "CONNECTIVITY" };
    }
    if (msg.includes("timeout") || msg.includes("etimedout")) return { category: "TIMEOUT" };
  }
  return { category: "UNKNOWN" };
}

/* ------------------------------------------------------------------ */
/* Secret-safe serialization                                           */
/* ------------------------------------------------------------------ */

const REDACT_KEY = /(pass(word|wd)?|secret|token|auth(orization)?|cookie|api[-_]?key|credential|refresh|session_key)/i;
const MAX_STR = 500;
const MAX_DEPTH = 5;
const MAX_KEYS = 30;
const MAX_ARRAY = 20;

export function scrub(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > MAX_STR ? `${value.slice(0, MAX_STR)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return "[dropped]";
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((v) => scrub(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: String(value.message).slice(0, MAX_STR) };
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).slice(0, MAX_KEYS)) {
      out[k] = REDACT_KEY.test(k) ? "[redacted]" : scrub(v, depth + 1);
    }
    return out;
  }
  return "[dropped]";
}

/* ------------------------------------------------------------------ */
/* Correlation (request id / route)                                    */
/*                                                                     */
/* The loader is registered once per server process by                 */
/* `instrumentation.ts` (see lib/observability/server.ts). Keeping it  */
/* out of this module's import graph keeps lib/errors.ts safe to use   */
/* from client bundles while still attaching correlation on the server.*/
/* ------------------------------------------------------------------ */

interface Correlation {
  requestId?: string;
  route?: string;
}

type CorrelationLoader = () => Promise<Correlation>;

/**
 * Bundlers may duplicate this module across chunk graphs (instrumentation
 * vs app runtime). State lives on globalThis so every copy shares one
 * registry and one correlation provider.
 */
interface ObservabilityGlobal {
  __fzCorrelationLoader?: CorrelationLoader;
  __fzSeenErrors?: WeakSet<object>;
}

const obsGlobal = globalThis as unknown as ObservabilityGlobal;

/** Registers the server-side correlation provider (called at boot). */
export function setCorrelationLoader(loader: CorrelationLoader) {
  obsGlobal.__fzCorrelationLoader = loader;
}

/* ------------------------------------------------------------------ */
/* Dedup registry — one failure, one actionable log                    */
/* ------------------------------------------------------------------ */

const seen = (obsGlobal.__fzSeenErrors ??= new WeakSet<object>());

function chainObjects(error: unknown): object[] {
  const out: object[] = [];
  let cur: unknown = error;
  let guard = 0;
  while (cur && typeof cur === "object" && guard < 10) {
    out.push(cur);
    cur = (cur as { cause?: unknown }).cause;
    guard += 1;
  }
  return out;
}

function alreadyLogged(error: unknown): boolean {
  return chainObjects(error).some((o) => seen.has(o));
}

function markLogged(error: unknown) {
  for (const o of chainObjects(error)) seen.add(o);
}

/* ------------------------------------------------------------------ */
/* Structured emission                                                 */
/* ------------------------------------------------------------------ */

interface StructuredPayload {
  level: LogLevel;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
  domain?: string;
  op?: string;
  route?: string;
  durationMs?: number;
}

function describeForLog(error: unknown): Record<string, unknown> | undefined {
  if (error === undefined || error === null) return undefined;
  if (error instanceof AppError) {
    return {
      name: error.name,
      appCode: error.code,
      status: error.status,
      userMessage: error.userMessage,
      cause: describeRaw(error.cause),
    };
  }
  const raw = describeRaw(error);
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : { error: scrub(raw) };
}

function describeRaw(error: unknown): unknown {
  if (error === undefined || error === null) return undefined;
  if (error instanceof Error) {
    const props = error as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = { name: error.name, message: error.message };
    if (typeof props.code === "string") out.code = props.code;
    if (typeof props.details === "string") out.details = props.details;
    if (typeof props.hint === "string") out.hint = props.hint;
    return out;
  }
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (typeof obj.message === "string") out.message = obj.message;
    if (typeof obj.code === "string") out.code = obj.code;
    if (typeof obj.details === "string") out.details = obj.details;
    if (typeof obj.hint === "string") out.hint = obj.hint;
    if (Object.keys(out).length > 0) return out;
  }
  return scrub(error);
}

function emit(payload: StructuredPayload) {
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: payload.level,
    domain: payload.domain ?? "app",
    op: payload.op,
    msg: payload.message,
  };
  const { category, dbCode } = classifyError(payload.error);
  record.category = category;
  if (dbCode) record.dbCode = dbCode;
  if (payload.route) record.route = payload.route;
  if (payload.durationMs !== undefined) record.durationMs = payload.durationMs;
  if (payload.error !== undefined && payload.error !== null) record.err = describeForLog(payload.error);
  if (payload.context && Object.keys(payload.context).length > 0) record.ctx = scrub(payload.context);

  const line = `[fight-zone] ${JSON.stringify(record)}`;
  if (payload.level === "error") console.error(line);
  else console.warn(line);
}

async function emitWithCorrelation(payload: StructuredPayload) {
  let corr: Correlation = {};
  const loader = obsGlobal.__fzCorrelationLoader;
  if (loader) {
    try {
      corr = await loader();
    } catch {
      corr = {};
    }
  }
  const { requestId, route } = corr;
  emit({
    ...payload,
    route: payload.route ?? (route ? safeRoute(route) : undefined),
    context: { ...payload.context, ...(requestId ? { requestId } : {}) },
  });
}

function safeRoute(raw: string): string | undefined {
  try {
    const url = new URL(raw, "http://internal");
    return url.pathname.slice(0, 200);
  } catch {
    return raw.split("?")[0]?.slice(0, 200);
  }
}

/**
 * Logs a structured, secret-safe, de-duplicated error (fire-and-forget).
 * Safe to call from server and client; correlation attaches where the
 * platform exposes request headers.
 */
export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  if (alreadyLogged(error)) return;
  markLogged(error);
  const { domain, op, route, durationMs, ...rest } = context ?? {};
  void emitWithCorrelation({
    level: "error",
    message,
    error,
    context: Object.keys(rest).length > 0 ? rest : undefined,
    domain: typeof domain === "string" ? domain : undefined,
    op: typeof op === "string" ? op : undefined,
    route: typeof route === "string" ? route : undefined,
    durationMs: typeof durationMs === "number" ? durationMs : undefined,
  });
}

/** Warn-severity degradation signal (optional dependency failed softly). */
export function logDegradation(message: string, error: unknown, context?: Record<string, unknown>) {
  if (alreadyLogged(error)) return;
  markLogged(error);
  const { domain, op, route, durationMs, ...rest } = context ?? {};
  void emitWithCorrelation({
    level: "warn",
    message,
    error,
    context: Object.keys(rest).length > 0 ? rest : undefined,
    domain: typeof domain === "string" ? domain : "degradation",
    op: typeof op === "string" ? op : undefined,
    route: typeof route === "string" ? route : undefined,
    durationMs: typeof durationMs === "number" ? durationMs : undefined,
  });
}

/** Converts any thrown value into a typed AppError (never throws). */
export function toAppError(error: unknown, context?: Record<string, unknown>): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new ValidationError("Please check the submitted information.", {
      cause: error,
      context,
    });
  }

  logError("Unhandled error", error, context);
  return new AppError("UNKNOWN", "Unhandled application error.", { cause: error, context });
}
