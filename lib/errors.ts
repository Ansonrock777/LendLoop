/**
 * Turns a failed Convex call into a sentence for a toast or inline message.
 *
 * Server errors made with `appError` carry `{ code, message, field? }`. Those
 * messages are written for people and never contain other users' data
 * (convex/lib/errors.ts), so the expected ones are shown as they are. Anything
 * else (a network drop, a validator error, a bug) gets the calm generic message,
 * so no internal detail ever reaches the screen.
 */
import { ConvexError } from "convex/values";
import type { AppErrorData, ErrorCode } from "@/convex/lib/errors";
import { copy } from "./copy";

/** Codes whose server message is useful to the person reading it. */
const SHOWN: ReadonlySet<ErrorCode> = new Set(["INVALID", "CONFLICT", "NOT_FOUND", "RATE_LIMITED"]);

export function appErrorData(e: unknown): AppErrorData | null {
  if (!(e instanceof ConvexError)) return null;
  const data = e.data as Partial<AppErrorData> | undefined;
  return data && typeof data.code === "string" && typeof data.message === "string" ? (data as AppErrorData) : null;
}

export const errorCode = (e: unknown): ErrorCode | null => appErrorData(e)?.code ?? null;

export function errorMessage(e: unknown): string {
  const data = appErrorData(e);
  if (data && SHOWN.has(data.code)) return data.message;
  if (data?.code === "UNAUTHENTICATED") return copy.signInAgain;
  return copy.saveError;
}
