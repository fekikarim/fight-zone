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

/** Logs a structured, secret-safe error on the server. */
export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const details =
    error instanceof AppError
      ? { code: error.code, status: error.status, cause: describeCause(error.cause) }
      : { cause: describeCause(error) };

  console.error(`[fight-zone] ${message}`, {
    ...context,
    ...details,
  });
}

function describeCause(cause: unknown): unknown {
  if (cause === undefined || cause === null) return undefined;
  if (cause instanceof Error) {
    // Strip the error's own message unless it is already a safe AppError.
    return { name: cause.name, message: cause instanceof AppError ? cause.userMessage : "hidden" };
  }
  return "non-error cause";
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
