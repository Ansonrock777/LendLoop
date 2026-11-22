/**
 * Abuse limits (SECURITY.md rule 8). Simple counters read inside the same
 * mutation that writes, so Convex's serializable transactions make them exact:
 * two parallel requests can't both slip under the cap.
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { LIMITS } from "./domain";
import { appError } from "./errors";

const DAY_MS = 86_400_000;

export async function assertListingCap(ctx: MutationCtx, ownerId: Id<"users">): Promise<void> {
  const active = await ctx.db
    .query("tools")
    .withIndex("by_owner_status", (q) => q.eq("ownerId", ownerId).eq("status", "active"))
    .take(LIMITS.maxActiveListingsPerUser);
  if (active.length >= LIMITS.maxActiveListingsPerUser) {
    throw appError(
      "RATE_LIMITED",
      `You can have up to ${LIMITS.maxActiveListingsPerUser} tools listed at once. Remove one to add another.`,
    );
  }
}

export async function assertRequestCaps(ctx: MutationCtx, borrowerId: Id<"users">, nowMs: number): Promise<void> {
  const pending = await ctx.db
    .query("loans")
    .withIndex("by_borrower_status", (q) => q.eq("borrowerId", borrowerId).eq("status", "pending"))
    .take(LIMITS.maxPendingRequestsPerUser);
  if (pending.length >= LIMITS.maxPendingRequestsPerUser) {
    throw appError(
      "RATE_LIMITED",
      `You have ${LIMITS.maxPendingRequestsPerUser} requests waiting for an answer. Wait for a reply or cancel one first.`,
    );
  }
  // Rolling 24 hours, counted from each loan's creation time (part of every index).
  const lastDay = await ctx.db
    .query("loans")
    .withIndex("by_borrower", (q) => q.eq("borrowerId", borrowerId).gt("_creationTime", nowMs - DAY_MS))
    .take(LIMITS.maxRequestsPerDay);
  if (lastDay.length >= LIMITS.maxRequestsPerDay) {
    throw appError("RATE_LIMITED", "You've sent a lot of requests today. Try again tomorrow.");
  }
}
