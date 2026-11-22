import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireLoanParty, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { appError } from "./lib/errors";
import { assertRequestCaps } from "./lib/limits";
import { enqueueNotification } from "./lib/notify";
import { rangesOverlap, todayIso, validateLoanDates } from "./lib/validate";
import { loanView, vLoanView } from "./lib/views";

/**
 * Loan lifecycle. Stored states: pending → approved → returned, or
 * pending → declined / cancelled. Every transition checks the caller's side of
 * the loan (requireLoanParty with `as`) and the current status, so a stale tab
 * or a forged id can't skip a step (SECURITY.md threat "IDOR").
 */

/** Lists are bounded; older history beyond this is admin-only (paginated there). */
const LIST_LIMIT = 100;

async function clashesWithApproved(
  ctx: MutationCtx,
  toolId: Id<"tools">,
  start: string,
  end: string,
  except?: Id<"loans">,
): Promise<boolean> {
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .take(100);
  return approved.some((l) => l._id !== except && rangesOverlap(start, end, l.startDate, l.endDate));
}

function requireStatus(loan: Doc<"loans">, status: Doc<"loans">["status"], message: string): void {
  if (loan.status !== status) throw appError("CONFLICT", message);
}

/* ---------- Mutations ---------- */

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  returns: v.id("loans"),
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const { user } = await requireUser(ctx);
    const now = Date.now();
    validateLoanDates(startDate, endDate, now);

    const tool = await ctx.db.get(toolId);
    if (!tool || tool.status !== "active") throw appError("NOT_FOUND", "That tool isn't listed any more.");
    if (tool.ownerId === user._id) throw appError("INVALID", "This is your own tool.");

    const mine = await ctx.db
      .query("loans")
      .withIndex("by_borrower_status", (q) => q.eq("borrowerId", user._id).eq("status", "pending"))
      .take(100);
    if (mine.some((l) => l.toolId === toolId)) {
      throw appError("CONFLICT", "You've already asked for this tool. Wait for an answer or cancel that request.");
    }
    if (await clashesWithApproved(ctx, toolId, startDate, endDate)) {
      throw appError("CONFLICT", "Someone is borrowing it on those dates. Try other days.", "start");
    }
    await assertRequestCaps(ctx, user._id, now);

    const loanId = await ctx.db.insert("loans", {
      toolId,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate,
      endDate,
      status: "pending",
    });
    await enqueueNotification(ctx, loanId, "request_created");
    return loanId;
  },
});

export const approve = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const { viewer, loan } = await requireLoanParty(ctx, loanId, { as: "lender" });
    requireStatus(loan, "pending", "This request has already been answered.");
    const tool = await ctx.db.get(loan.toolId);
    if (!tool || tool.status !== "active") throw appError("CONFLICT", "This tool isn't listed any more.");
    if (loan.endDate < todayIso(Date.now())) {
      throw appError("CONFLICT", "These dates have already passed. Decline it and they can ask again.");
    }
    if (await clashesWithApproved(ctx, loan.toolId, loan.startDate, loan.endDate, loanId)) {
      throw appError("CONFLICT", "You've already lent it out on some of these days.");
    }
    await ctx.db.patch(loanId, { status: "approved", decidedAt: Date.now() });
    await writeAudit(ctx, { actorId: viewer.user._id, action: "approve", targetType: "loan", targetId: loanId });
    await enqueueNotification(ctx, loanId, "request_approved");
    return null;
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const { viewer, loan } = await requireLoanParty(ctx, loanId, { as: "lender" });
    requireStatus(loan, "pending", "This request has already been answered.");
    await ctx.db.patch(loanId, { status: "declined", decidedAt: Date.now() });
    await writeAudit(ctx, { actorId: viewer.user._id, action: "decline", targetType: "loan", targetId: loanId });
    await enqueueNotification(ctx, loanId, "request_declined");
    return null;
  },
});

/** Borrower withdraws a request that hasn't been answered yet. */
export const cancel = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const { loan } = await requireLoanParty(ctx, loanId, { as: "borrower" });
    requireStatus(loan, "pending", "This request has already been answered, so it can't be cancelled.");
    await ctx.db.patch(loanId, { status: "cancelled" });
    return null;
  },
});

/** Lender confirms the tool is back. Closes the contact window (D2). */
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const { viewer, loan } = await requireLoanParty(ctx, loanId, { as: "lender" });
    requireStatus(loan, "approved", "Only a tool that's out on loan can be marked returned.");
    await ctx.db.patch(loanId, { status: "returned", returnedAt: Date.now() });
    await writeAudit(ctx, {
      actorId: viewer.user._id,
      action: "mark_returned",
      targetType: "loan",
      targetId: loanId,
    });
    return null;
  },
});

/* ---------- Queries ---------- */

/** "My requests": loans where the caller borrows, newest first. */
export const myRequests = query({
  args: {},
  returns: v.array(vLoanView),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const now = Date.now();
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .take(LIST_LIMIT);
    return await Promise.all(loans.map((l) => loanView(ctx, l, "borrower", now)));
  },
});

/** "Incoming": loans on the caller's tools, newest first. */
export const incoming = query({
  args: {},
  returns: v.array(vLoanView),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const now = Date.now();
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .order("desc")
      .take(LIST_LIMIT);
    return await Promise.all(loans.map((l) => loanView(ctx, l, "lender", now)));
  },
});

/** Badge count in the shell. */
export const pendingIncomingCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const pending = await ctx.db
      .query("loans")
      .withIndex("by_lender_status", (q) => q.eq("lenderId", user._id).eq("status", "pending"))
      .take(LIST_LIMIT);
    return pending.length;
  },
});

/** Loan page with activity. Either party, or an admin read-only (no email for admins). */
export const get = query({
  args: { loanId: v.id("loans") },
  returns: vLoanView,
  handler: async (ctx, { loanId }) => {
    const { loan, role } = await requireLoanParty(ctx, loanId, { allowAdmin: true });
    return await loanView(ctx, loan, role, Date.now(), { withAutomation: true });
  },
});
