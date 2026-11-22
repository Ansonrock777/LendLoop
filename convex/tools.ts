import { paginationOptsValidator, paginationResultValidator, type PaginationOptions } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireToolOwner, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { appError } from "./lib/errors";
import { assertListingCap } from "./lib/limits";
import { hasOpenApprovedLoan, retireTool } from "./lib/listing";
import { cleanToolDescription, cleanToolName } from "./lib/validate";
import { vCategory, vCondition } from "./lib/validators";
import { onLoanUntil, toPublicTool, vFeedTool, vMyListing, vPublicTool } from "./lib/views";
import type { Category } from "./lib/domain";

/** Hard ceiling on page size, whatever the client asks for. The UI uses 12 (LIMITS.feedPageSize). */
const MAX_PAGE = 50;

function checkPage(opts: PaginationOptions): void {
  if (!Number.isInteger(opts.numItems) || opts.numItems < 1 || opts.numItems > MAX_PAGE) {
    throw appError("INVALID", `Ask for between 1 and ${MAX_PAGE} items.`, "numItems");
  }
}

/** Active tools, newest first, optionally one category. */
function activeTools(ctx: QueryCtx, category: Category | undefined) {
  return category
    ? ctx.db
        .query("tools")
        .withIndex("by_category_status", (q) => q.eq("category", category).eq("status", "active"))
        .order("desc")
    : ctx.db
        .query("tools")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .order("desc");
}

/**
 * Public board for signed-out visitors (D1, SECURITY.md rule 2). The one query
 * with no auth check: it returns only id, name and category, picked by hand.
 */
export const publicList = query({
  args: { paginationOpts: paginationOptsValidator, category: v.optional(vCategory) },
  returns: paginationResultValidator(vPublicTool),
  handler: async (ctx, { paginationOpts, category }) => {
    checkPage(paginationOpts);
    const result = await activeTools(ctx, category).paginate(paginationOpts);
    return { ...result, page: result.page.map(toPublicTool) };
  },
});

/** Signed-in feed (D7): adds condition, description, lender first name and badge, loan state. Never emails. */
export const listAvailable = query({
  args: { paginationOpts: paginationOptsValidator, category: v.optional(vCategory) },
  returns: paginationResultValidator(vFeedTool),
  handler: async (ctx, { paginationOpts, category }) => {
    const { user } = await requireUser(ctx);
    checkPage(paginationOpts);
    const now = Date.now();
    const result = await activeTools(ctx, category).paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          ...toPublicTool(tool),
          condition: tool.condition,
          description: tool.description,
          lenderFirstName: owner?.firstName ?? "Neighbour",
          lenderTrusted: owner?.isTrustedLender ?? false,
          onLoanUntil: await onLoanUntil(ctx, tool._id, now),
          isOwn: tool.ownerId === user._id,
        };
      }),
    );
    return { ...result, page };
  },
});

async function myListing(ctx: QueryCtx, tool: Doc<"tools">, now: number) {
  const pending = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
    .take(100);
  return {
    ...toPublicTool(tool),
    condition: tool.condition,
    description: tool.description,
    onLoanUntil: await onLoanUntil(ctx, tool._id, now),
    pendingRequests: pending.length,
  };
}

/** The caller's own active listings, newest first. Bounded by the listing cap. */
export const mine = query({
  args: {},
  returns: v.array(vMyListing),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const now = Date.now();
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", "active"))
      .order("desc")
      .take(50);
    return await Promise.all(tools.map((t) => myListing(ctx, t, now)));
  },
});

/** One of the caller's listings, for the edit form. Anyone else gets FORBIDDEN. */
export const getMine = query({
  args: { toolId: v.id("tools") },
  returns: vMyListing,
  handler: async (ctx, { toolId }) => {
    const { tool } = await requireToolOwner(ctx, toolId);
    return await myListing(ctx, tool, Date.now());
  },
});

const toolFields = {
  name: v.string(),
  category: vCategory,
  condition: vCondition,
  description: v.string(),
};

export const create = mutation({
  args: toolFields,
  returns: v.id("tools"),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const name = cleanToolName(args.name);
    const description = cleanToolDescription(args.description);
    await assertListingCap(ctx, user._id);
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name,
      category: args.category,
      condition: args.condition,
      description,
      status: "active",
    });
  },
});

/** Owner only. Admins can't edit someone's words, only remove the listing (with a reason). */
export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFields },
  returns: v.null(),
  handler: async (ctx, { toolId, ...args }) => {
    await requireToolOwner(ctx, toolId);
    await ctx.db.patch(toolId, {
      name: cleanToolName(args.name),
      category: args.category,
      condition: args.condition,
      description: cleanToolDescription(args.description),
    });
    return null;
  },
});

/**
 * Owner takes a tool off the board. Not allowed while it's lent out or booked,
 * so a borrower never loses the record of what they're holding. Waiting
 * requests are declined (and the borrower told).
 */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    const { viewer, tool } = await requireToolOwner(ctx, toolId);
    if (await hasOpenApprovedLoan(ctx, toolId)) {
      throw appError("CONFLICT", "This tool is lent out or booked. Mark it returned before removing it.");
    }
    await retireTool(ctx, tool);
    await writeAudit(ctx, {
      actorId: viewer.user._id,
      action: "delete_listing",
      targetType: "tool",
      targetId: toolId,
    });
    return null;
  },
});
