/**
 * Taking a tool off the board, shared by the owner (tools.remove) and an admin
 * (admin.removeListing). The row is kept with status "removed" so old loans
 * still show what was borrowed; it disappears from every feed and from
 * requireToolOwner. Open requests are declined so nobody waits on a ghost.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { enqueueNotification } from "./notify";

export async function retireTool(ctx: MutationCtx, tool: Doc<"tools">): Promise<Id<"loans">[]> {
  const pending = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
    .take(100);
  const now = Date.now();
  for (const loan of pending) {
    await ctx.db.patch(loan._id, { status: "declined", decidedAt: now });
    await enqueueNotification(ctx, loan._id, "request_declined");
  }
  await ctx.db.patch(tool._id, { status: "removed" });
  return pending.map((l) => l._id);
}

/** True while a borrower has the tool or is booked to collect it (approved, not returned). */
export async function hasOpenApprovedLoan(ctx: MutationCtx, toolId: Id<"tools">): Promise<boolean> {
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .first();
  return approved !== null;
}
