import { ConvexError } from "convex/values";

/**
 * Error codes the UI can map to plain-language messages.
 * Messages here are safe to show: they never include other users' data.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID"
  | "RATE_LIMITED"
  | "CONFLICT";

export type AppErrorData = { code: ErrorCode; message: string; field?: string };

export function appError(code: ErrorCode, message: string, field?: string): ConvexError<AppErrorData> {
  return new ConvexError(field ? { code, message, field } : { code, message });
}
