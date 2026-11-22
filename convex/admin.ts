import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { appError } from "./lib/errors";
import { retireTool } from "./lib/listing";
import { cleanAdminReason } from "./lib/validate";
import { vAuditAction, vAuditTarget, vCategory } from "./lib/validators";
import { loanView, vLoanView } from "./lib/views";

/**
 * Admin console. Every function starts with requireAdmin (exact "admin" claim in
 * the Clerk-signed JWT). Admins see first names and loan states, never emails:
 * they aren't a party to anyone's loan (D2, SECURITY.md rule 2).
 */

const MAX_PAGE = 50;

function checkPage(numItems: number): void {
  if (!Number.isInteger(numItems) || numItems < 1 || numItems > MAX_PAGE) {
    throw appError("INVALID", `Ask for between 1 and ${MAX_PAGE} items.`, "numItems");
  }
}

export const allLoans = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(vLoanView),
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    checkPage(paginationOpts.numItems);
    const now = Date.now();
    const result = await ctx.db.query("loans").order("desc").paginate(paginationOpts);
    const page = await Promise.all(result.page.map((l) => loanView(ctx, l, "admin", now)));
    return { ...result, page };
  },
});

const vAdminListing = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: vCategory,
  lenderFirstName: v.string(),
});

export const listings = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(vAdminListing),
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    checkPage(paginationOpts.numItems);
    const result = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
        lenderFirstName: (await ctx.db.get(t.ownerId))?.firstName ?? "Neighbour",
      })),
    );
    return { ...result, page };
  },
});

/**
 * People who lend (at least one active listing) or already carry the badge.
 * Bounded scan: fine for a street-sized demo; production would keep a
 * listing count on the user row and index it.
 */
export const lenders = query({
  args: {},
  returns: v.array(
    v.object({ _id: v.id("users"), firstName: v.string(), listings: v.number(), trusted: v.boolean() }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(500);
    const rows = await Promise.all(
      users.map(async (u) => {
        const active = await ctx.db
          .query("tools")
          .withIndex("by_owner_status", (q) => q.eq("ownerId", u._id).eq("status", "active"))
          .take(100);
        return { _id: u._id, firstName: u.firstName, listings: active.length, trusted: u.isTrustedLender };
      }),
    );
    return rows
      .filter((r) => r.listings > 0 || r.trusted)
      .sort((a, b) => b.listings - a.listings || a.firstName.localeCompare(b.firstName));
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, trusted }) => {
    const { user: admin } = await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw appError("NOT_FOUND", "That neighbour doesn't exist.");
    if (target.isTrustedLender === trusted) return null; // no change, nothing to audit
    await ctx.db.patch(userId, { isTrustedLender: trusted });
    await writeAudit(ctx, {
      actorId: admin._id,
      action: trusted ? "set_trusted" : "unset_trusted",
      targetType: "user",
      targetId: userId,
    });
    return null;
  },
});

/**
 * Admin takes down a listing, with a short reason kept in the audit log (D15).
 * Unlike the owner, an admin may do this while the tool is lent out: the
 * approved loan stays so the return can still be recorded.
 */
export const removeListing = mutation({
  args: { toolId: v.id("tools"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, { toolId, reason }) => {
    const { user: admin } = await requireAdmin(ctx);
    const cleanReason = cleanAdminReason(reason);
    const tool = await ctx.db.get(toolId);
    if (!tool || tool.status !== "active") throw appError("NOT_FOUND", "That tool isn't listed any more.");
    await retireTool(ctx, tool);
    await writeAudit(ctx, {
      actorId: admin._id,
      action: "remove_listing",
      targetType: "tool",
      targetId: toolId,
      reason: cleanReason,
    });
    return null;
  },
});

/** Audit trail, newest first (SECURITY.md rule 9). Actor by first name; no emails are ever stored. */
export const auditLog = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      _id: v.id("auditLog"),
      at: v.number(),
      actorFirstName: v.string(),
      action: vAuditAction,
      targetType: vAuditTarget,
      targetId: v.string(),
      reason: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    checkPage(paginationOpts.numItems);
    const result = await ctx.db.query("auditLog").withIndex("by_at").order("desc").paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (a) => ({
        _id: a._id,
        at: a.at,
        actorFirstName: (await ctx.db.get(a.actorId))?.firstName ?? "Neighbour",
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        ...(a.reason ? { reason: a.reason } : {}),
      })),
    );
    return { ...result, page };
  },
});

/** Notifications that ran out of retries and reminders n8n reported as failed, newest first. */
export const failedAutomations = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      at: v.number(),
      type: v.union(
        v.literal("request_created"),
        v.literal("request_approved"),
        v.literal("request_declined"),
        v.literal("reminder"),
        v.literal("workflow"),
      ),
      /** Absent for whole-workflow failures reported by the n8n error workflow. */
      loanId: v.optional(v.id("loans")),
      toolName: v.string(),
      error: v.string(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [outbox, events, workflowErrors] = await Promise.all([
      ctx.db.query("outbox").withIndex("by_status", (q) => q.eq("status", "failed")).order("desc").take(50),
      ctx.db
        .query("automationEvents")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .order("desc")
        .take(50),
      ctx.db.query("workflowErrors").withIndex("by_at").order("desc").take(50),
    ]);
    const toolName = async (loanId: (typeof outbox)[number]["loanId"]) => {
      const loan = await ctx.db.get(loanId);
      const tool = loan ? await ctx.db.get(loan.toolId) : null;
      return tool?.name ?? "Removed tool";
    };
    const rows = await Promise.all([
      ...outbox.map(async (o) => ({
        id: o._id as string,
        at: o._creationTime,
        type: o.type,
        loanId: o.loanId,
        toolName: await toolName(o.loanId),
        error: o.lastError ?? "Delivery failed.",
      })),
      ...events.map(async (e) => ({
        id: e._id as string,
        at: e.at,
        type: "reminder" as const,
        loanId: e.loanId,
        toolName: await toolName(e.loanId),
        error: e.detail ?? "Reminder failed.",
      })),
      ...workflowErrors.map(async (w) => ({
        id: w._id as string,
        at: w.at,
        type: "workflow" as const,
        toolName: w.workflow,
        error: w.message,
      })),
    ]);
    return rows.sort((a, b) => b.at - a.at);
  },
});
