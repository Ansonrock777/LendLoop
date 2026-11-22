/**
 * Outgoing notifications (SECURITY.md rules 5 and 6). Mutations only write an
 * outbox row inside the same transaction as the state change, so a notification
 * exists if and only if the change committed. The row also schedules delivery
 * (convex/notify.ts), which signs and POSTs it to n8n with retries and backoff.
 */
import type { Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { vNotificationType } from "./validators";

export async function enqueueNotification(
  ctx: MutationCtx,
  loanId: Id<"loans">,
  type: Infer<typeof vNotificationType>,
): Promise<string> {
  // eventId is the idempotency key n8n uses to skip duplicates. Random, not guessable.
  const eventId = `evt_${crypto.randomUUID()}`;
  const outboxId = await ctx.db.insert("outbox", {
    eventId,
    loanId,
    type,
    status: "pending",
    attempts: 0,
    nextAttemptAt: Date.now(),
  });
  // Scheduled functions only run if this mutation commits.
  await ctx.scheduler.runAfter(0, internal.notify.deliver, { outboxId });
  return eventId;
}
