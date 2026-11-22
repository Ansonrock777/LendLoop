/**
 * Read models (SECURITY.md rule 2). Queries never return whole documents: each
 * view below picks its fields by hand, so adding a column to the schema can't
 * leak it to the browser by accident. Shapes match `lib/types.ts`.
 */
import { v, type Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { LoanRole } from "./auth";
import { vCategory, vCondition } from "./validators";
import { todayIso } from "./validate";

/* ---------- Validators for return values ---------- */

/** Everything a signed-out visitor may ever receive. A test checks these exact keys. */
export const vPublicTool = v.object({ _id: v.id("tools"), name: v.string(), category: vCategory });

export const vLoanViewStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("overdue"),
  v.literal("returned"),
  v.literal("cancelled"),
);

export const vFeedTool = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: vCategory,
  condition: vCondition,
  description: v.string(),
  lenderFirstName: v.string(),
  lenderTrusted: v.boolean(),
  onLoanUntil: v.union(v.string(), v.null()),
  isOwn: v.boolean(),
});

export const vMyListing = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: vCategory,
  condition: vCondition,
  description: v.string(),
  onLoanUntil: v.union(v.string(), v.null()),
  pendingRequests: v.number(),
});

export const vAutomationView = v.object({
  id: v.string(),
  kind: v.union(
    v.literal("request-email"),
    v.literal("decision-email"),
    v.literal("reminder"),
    v.literal("reminder-failed"),
  ),
  state: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
  at: v.number(),
});

export const vLoanView = v.object({
  _id: v.id("loans"),
  tool: vPublicTool,
  lenderFirstName: v.string(),
  borrowerFirstName: v.string(),
  start: v.string(),
  end: v.string(),
  status: vLoanViewStatus,
  /** Which side the viewer is on. "admin" means a read-only view. */
  viewerRole: v.union(v.literal("lender"), v.literal("borrower"), v.literal("admin")),
  requestedOn: v.string(),
  decidedOn: v.optional(v.string()),
  returnedOn: v.optional(v.string()),
  /** The OTHER party's email: only while approved and not returned, and never for admins (D2). */
  pickupEmail: v.optional(v.string()),
  automation: v.optional(v.array(vAutomationView)),
});

export type LoanView = Infer<typeof vLoanView>;
export type LoanViewStatus = Infer<typeof vLoanViewStatus>;

/* ---------- Pure rules ---------- */

/** "Overdue" is not stored: it is approved + end date before today (UTC). */
export function viewStatus(loan: Pick<Doc<"loans">, "status" | "endDate">, nowMs: number): LoanViewStatus {
  if (loan.status === "approved" && loan.endDate < todayIso(nowMs)) return "overdue";
  return loan.status;
}

/** Email is shared only with the other party, only while the tool is out (approved, incl. overdue). */
export function contactAllowed(loan: Pick<Doc<"loans">, "status">, role: LoanRole): boolean {
  return loan.status === "approved" && role !== "admin";
}

export const toPublicTool = (tool: Doc<"tools">) => ({ _id: tool._id, name: tool.name, category: tool.category });

/* ---------- Lookups ---------- */

/**
 * The end date of the loan the tool is out on right now (approved, started, not
 * returned), or null. Overdue loans count as still out.
 */
export async function onLoanUntil(ctx: QueryCtx, toolId: Id<"tools">, nowMs: number): Promise<string | null> {
  const today = todayIso(nowMs);
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .take(50);
  let until: string | null = null;
  for (const l of approved) {
    if (l.startDate <= today && (until === null || l.endDate > until)) until = l.endDate;
  }
  return until;
}

export async function loanView(
  ctx: QueryCtx,
  loan: Doc<"loans">,
  role: LoanRole,
  nowMs: number,
  opts: { withAutomation?: boolean } = {},
): Promise<LoanView> {
  const [tool, lender, borrower] = await Promise.all([
    ctx.db.get(loan.toolId),
    ctx.db.get(loan.lenderId),
    ctx.db.get(loan.borrowerId),
  ]);
  const view: LoanView = {
    _id: loan._id,
    // A removed tool still shows its name on old loans; only id/name/category, as for the public.
    tool: tool ? toPublicTool(tool) : { _id: loan.toolId, name: "Removed tool", category: "other" },
    lenderFirstName: lender?.firstName ?? "Neighbour",
    borrowerFirstName: borrower?.firstName ?? "Neighbour",
    start: loan.startDate,
    end: loan.endDate,
    status: viewStatus(loan, nowMs),
    viewerRole: role,
    requestedOn: todayIso(loan._creationTime),
  };
  if (loan.decidedAt) view.decidedOn = todayIso(loan.decidedAt);
  if (loan.returnedAt) view.returnedOn = todayIso(loan.returnedAt);
  if (contactAllowed(loan, role)) {
    const other = role === "lender" ? borrower : lender;
    if (other?.email) view.pickupEmail = other.email;
  }
  if (opts.withAutomation) view.automation = await automationFor(ctx, loan._id);
  return view;
}

/** Notification and reminder history for one loan, oldest first. No payloads, no addresses. */
export async function automationFor(ctx: QueryCtx, loanId: Id<"loans">) {
  const [outbox, events] = await Promise.all([
    ctx.db.query("outbox").withIndex("by_loan", (q) => q.eq("loanId", loanId)).take(50),
    ctx.db.query("automationEvents").withIndex("by_loan", (q) => q.eq("loanId", loanId)).take(50),
  ]);
  const items: Infer<typeof vAutomationView>[] = [
    ...outbox.map((o) => ({
      id: o._id as string,
      kind: o.type === "request_created" ? ("request-email" as const) : ("decision-email" as const),
      state: o.status === "pending" ? ("queued" as const) : o.status,
      at: o._creationTime,
    })),
    ...events
      .filter((e) => e.kind === "reminder")
      .map((e) => ({
        id: e._id as string,
        kind: e.status === "failed" ? ("reminder-failed" as const) : ("reminder" as const),
        state: e.status,
        at: e.at,
      })),
  ];
  return items.sort((a, b) => a.at - b.at);
}
