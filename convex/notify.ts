/**
 * Delivery of outbox rows to n8n (SECURITY.md rules 2, 3, 5, 6). Internal only.
 *
 * Wire format (Convex → n8n):
 *   POST N8N_NOTIFY_URL
 *   X-LendLoop-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${payload}`>
 *   body: {"payload": "<the JSON string below>"}
 * The payload travels as a string so n8n verifies the exact bytes that were
 * signed, instead of re-serialising parsed JSON (which can reorder keys).
 *
 * The payload carries only what the email needs (rule 2): no ids beyond the
 * eventId, no other user's email.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { SIGNATURE_HEADER, signPayload } from "./lib/hmac";

/** 5 tries in total: now, +1 min, +5 min, +15 min, +60 min. Then "failed" (visible to admins). */
export const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
const TIMEOUT_MS = 15_000;

const vPayload = v.object({
  eventId: v.string(),
  type: v.union(v.literal("request_created"), v.literal("request_approved"), v.literal("request_declined")),
  recipientEmail: v.string(),
  recipientFirstName: v.string(),
  /** The other person's first name, so the email can say who asked or answered. */
  otherFirstName: v.string(),
  toolName: v.string(),
  startDate: v.string(),
  endDate: v.string(),
});

/** The payload for a pending row, or null if it was already handled (retries are safe to repeat). */
export const job = internalQuery({
  args: { outboxId: v.id("outbox") },
  returns: v.union(v.null(), v.object({ payload: vPayload, missingEmail: v.boolean() })),
  handler: async (ctx, { outboxId }) => {
    const row = await ctx.db.get(outboxId);
    if (!row || row.status !== "pending") return null;
    const loan = await ctx.db.get(row.loanId);
    if (!loan) return null;
    const [tool, lender, borrower] = await Promise.all([
      ctx.db.get(loan.toolId),
      ctx.db.get(loan.lenderId),
      ctx.db.get(loan.borrowerId),
    ]);
    // A new request goes to the lender; the answer goes to the borrower.
    const toLender = row.type === "request_created";
    const recipient = toLender ? lender : borrower;
    const other = toLender ? borrower : lender;
    return {
      missingEmail: !recipient?.email,
      payload: {
        eventId: row.eventId,
        type: row.type,
        recipientEmail: recipient?.email ?? "",
        recipientFirstName: recipient?.firstName ?? "Neighbour",
        otherFirstName: other?.firstName ?? "A neighbour",
        toolName: tool?.name ?? "a tool",
        startDate: loan.startDate,
        endDate: loan.endDate,
      },
    };
  },
});

/** Records one attempt; schedules the next with backoff, or marks the row failed after the last try. */
export const recordAttempt = internalMutation({
  args: { outboxId: v.id("outbox"), error: v.optional(v.string()), final: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { outboxId, error, final }) => {
    const row = await ctx.db.get(outboxId);
    if (!row || row.status !== "pending") return null;
    const attempts = row.attempts + 1;
    if (!error) {
      await ctx.db.patch(outboxId, { status: "sent", attempts, lastError: undefined });
      return null;
    }
    if (final || attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(outboxId, { status: "failed", attempts, lastError: error });
      return null;
    }
    const delay = BACKOFF_MS[attempts - 1];
    await ctx.db.patch(outboxId, { attempts, lastError: error, nextAttemptAt: Date.now() + delay });
    await ctx.scheduler.runAfter(delay, internal.notify.deliver, { outboxId });
    return null;
  },
});

export const deliver = internalAction({
  args: { outboxId: v.id("outbox") },
  returns: v.null(),
  handler: async (ctx, { outboxId }) => {
    const job = await ctx.runQuery(internal.notify.job, { outboxId });
    if (!job) return null;
    if (job.missingEmail) {
      // Retrying can't fix a missing address: fail at once so an admin sees it.
      await ctx.runMutation(internal.notify.recordAttempt, {
        outboxId,
        error: "No email address on file for this neighbour.",
        final: true,
      });
      return null;
    }
    const error = await post(JSON.stringify(job.payload));
    await ctx.runMutation(internal.notify.recordAttempt, { outboxId, ...(error ? { error } : {}) });
    return null;
  },
});

/** Signs and sends. Returns a short, safe error message (no URL, no secret, no body), or null on success. */
async function post(payload: string): Promise<string | null> {
  const url = process.env.N8N_NOTIFY_URL;
  const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
  if (!url || !secret || secret.length < 32) return "Automation isn't configured yet.";
  try {
    const signature = await signPayload(secret, payload, Date.now());
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: signature },
      body: JSON.stringify({ payload }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return null;
    return res.status === 401 ? "n8n rejected the signature." : `n8n answered with an error (${res.status}).`;
  } catch (e) {
    return (e as Error)?.name === "TimeoutError" ? "n8n did not answer in time." : "Could not reach n8n.";
  }
}
