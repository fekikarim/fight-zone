import { ZodError } from "zod";

/**
 * Typed application error hierarchy.
 * The foundation guarantees:
 *  - predictable, typed failures
 *  - no raw database/Supabase errors surfaced to users
 *  - consistent user-safe messages
 *  - server-side logging without leaking secrets
 */

export type AppErrorCode =
  | "VALIDATION"
  | "AUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DATABASE"
  | "UNKNOWN";

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

/**
 * Logs a structured, secret-safe error. Server-side observability log:
 * PostgREST diagnostics (message/code/details/hint) are surfaced at the top
 * level so failures are immediately actionable instead of printing as `{}`.
 */
export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const described = describeError(error);
  const flat =
    typeof described === "object" && described !== null && !Array.isArray(described)
      ? (described as Record<string, unknown>)
      : { error: described };

  console.error(`[fight-zone] ${message}`, {
    ...context,
    ...flat,
  });
}

function describeError(error: unknown): unknown {
  if (error === undefined || error === null) return undefined;
  if (error instanceof AppError) {
    return {
      appCode: error.code,
      status: error.status,
      name: error.name,
      message: error.userMessage,
      cause: describeCause(error.cause),
    };
  }
  return describeCause(error);
}

function describeCause(cause: unknown): unknown {
  if (cause === undefined || cause === null) return undefined;
  if (cause instanceof Error) {
    // Server-side observability log — the raw message is safe to include
    // (these logs never reach the client; user-facing messages come from
    // AppError.userMessage instead).
    const safe: Record<string, unknown> = { name: cause.name, message: cause.message };
    // Include PostgREST / Supabase error details if present.
    const props = cause as unknown as Record<string, unknown>;
    if (typeof props.code === "string") safe.code = props.code;
    if (typeof props.details === "string") safe.details = props.details;
    if (typeof props.hint === "string") safe.hint = props.hint;
    return safe;
  }
  if (typeof cause === "object" && cause !== null) {
    // Supabase PostgREST errors are plain objects with { message, code, details, hint }
    const obj = cause as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (typeof obj.message === "string") out.message = obj.message;
    if (typeof obj.code === "string") out.code = obj.code;
    if (typeof obj.details === "string") out.details = obj.details;
    if (typeof obj.hint === "string") out.hint = obj.hint;
    return Object.keys(out).length > 0 ? out : cause;
  }
  return cause;
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
