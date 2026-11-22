/**
 * What n8n reads and writes back, through the signed HTTP endpoints in
 * convex/http.ts. Internal only: nothing here is callable from a browser.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { cleanText, isIsoDate, daysBetween, todayIso } from "./lib/validate";

/** Reminder key: one reminder per loan per UTC day (SECURITY.md rule 5). */
export const reminderKey = (loanId: string, day: string) => `${loanId}:${day}`;

const vReminder = v.object({
  loanId: v.id("loans"),
  idempotencyKey: v.string(),
  recipientEmail: v.string(),
  recipientFirstName: v.string(),
  lenderFirstName: v.string(),
  toolName: v.string(),
  endDate: v.string(),
  daysOverdue: v.number(),
});

/**
 * Approved loans whose end date has passed and that haven't had a reminder
 * sent today. Only the borrower's email (the recipient) leaves Convex.
 */
export const overdueReminders = internalQuery({
  args: {},
  returns: v.object({ day: v.string(), reminders: v.array(vReminder) }),
  handler: async (ctx) => {
    const day = todayIso(Date.now());
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_end", (q) => q.eq("status", "approved").lt("endDate", day))
      .take(100);
    const reminders = [];
    for (const loan of loans) {
      const key = reminderKey(loan._id, day);
      const done = await ctx.db
        .query("automationEvents")
        .withIndex("by_key", (q) => q.eq("idempotencyKey", key))
        .unique();
      if (done?.status === "sent") continue;
      const [tool, borrower, lender] = await Promise.all([
        ctx.db.get(loan.toolId),
        ctx.db.get(loan.borrowerId),
        ctx.db.get(loan.lenderId),
      ]);
      if (!borrower?.email) continue; // nothing to send to; demo users have .test addresses
      reminders.push({
        loanId: loan._id,
        idempotencyKey: key,
        recipientEmail: borrower.email,
        recipientFirstName: borrower.firstName,
        lenderFirstName: lender?.firstName ?? "the lender",
        toolName: tool?.name ?? "the tool",
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, day),
      });
    }
    return { day, reminders };
  },
});

/**
 * Write-back from the reminder workflow. One row per idempotency key: a retry
 * updates the existing row (failed → sent) instead of adding a second one.
 */
export const recordReminder = internalMutation({
  args: { idempotencyKey: v.string(), loanId: v.string(), status: v.union(v.literal("sent"), v.literal("failed")), detail: v.optional(v.string()) },
  returns: v.union(v.literal("ok"), v.literal("invalid")),
  handler: async (ctx, args) => {
    const loanId = ctx.db.normalizeId("loans", args.loanId);
    if (!loanId || !(await ctx.db.get(loanId))) return "invalid";
    const [keyLoan, day, ...rest] = args.idempotencyKey.split(":");
    if (rest.length || keyLoan !== loanId || !day || !isIsoDate(day)) return "invalid";
    const detail = args.detail ? cleanText(args.detail, { field: "detail", max: 1000 }).slice(0, 200) : undefined;

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) {
      // "sent" is final: a late "failed" from a stale retry can't undo it.
      if (existing.status !== "sent") {
        await ctx.db.patch(existing._id, { status: args.status, detail, at: Date.now() });
      }
      return "ok";
    }
    await ctx.db.insert("automationEvents", {
      idempotencyKey: args.idempotencyKey,
      loanId,
      kind: "reminder",
      status: args.status,
      detail,
      at: Date.now(),
    });
    return "ok";
  },
});

/** Report from the n8n error workflow. Text is cleaned and cut short; it's shown to admins only. */
export const recordWorkflowError = internalMutation({
  args: { workflow: v.string(), executionId: v.optional(v.string()), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const clip = (s: string, max: number) => cleanText(s.slice(0, max * 4), { field: "text", max: max * 4 }).slice(0, max);
    await ctx.db.insert("workflowErrors", {
      workflow: clip(args.workflow, 80) || "Unknown workflow",
      executionId: args.executionId ? clip(args.executionId, 40) : undefined,
      message: clip(args.message, 200) || "The workflow failed.",
      at: Date.now(),
    });
    return null;
  },
});
