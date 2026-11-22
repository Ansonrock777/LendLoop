/**
 * Authorization helpers (SECURITY.md rule 1). Deny by default: every public
 * function starts with one of these, and each throws unless the caller is
 * allowed. The UI hiding a button is a convenience; this is the real check.
 */
import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appError } from "./errors";

type Ctx = QueryCtx | MutationCtx;

export type Viewer = { user: Doc<"users">; identity: UserIdentity; isAdmin: boolean };
export type LoanRole = "lender" | "borrower" | "admin";

/**
 * Admin comes only from the `role` claim in the Clerk-signed JWT, which is set
 * by hand in the Clerk dashboard (publicMetadata.role). Exact match, nothing else.
 */
export function isAdminIdentity(identity: UserIdentity): boolean {
  return identity.role === "admin";
}

export async function requireIdentity(ctx: Pick<Ctx, "auth">): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw appError("UNAUTHENTICATED", "Please sign in to do that.");
  return identity;
}

/** The signed-in user's row, or null if signed out or not stored yet. For queries that degrade quietly. */
export async function getViewer(ctx: Ctx): Promise<Viewer | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) return null;
  return { user, identity, isAdmin: isAdminIdentity(identity) };
}

export async function requireUser(ctx: Ctx): Promise<Viewer> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw appError("UNAUTHENTICATED", "Your account is still being set up. Try again in a moment.");
  return { user, identity, isAdmin: isAdminIdentity(identity) };
}

export async function requireAdmin(ctx: Ctx): Promise<Viewer> {
  const viewer = await requireUser(ctx);
  if (!viewer.isAdmin) throw appError("FORBIDDEN", "This is only for admins.");
  return viewer;
}

/** Caller must own the active tool. `allowAdmin` lets an admin act on any tool (e.g. remove a listing). */
export async function requireToolOwner(
  ctx: Ctx,
  toolId: Id<"tools">,
  opts: { allowAdmin?: boolean } = {},
): Promise<{ viewer: Viewer; tool: Doc<"tools"> }> {
  const viewer = await requireUser(ctx);
  const tool = await ctx.db.get(toolId);
  if (!tool || tool.status !== "active") throw appError("NOT_FOUND", "That tool isn't listed any more.");
  const isOwner = tool.ownerId === viewer.user._id;
  if (!isOwner && !(opts.allowAdmin && viewer.isAdmin)) {
    throw appError("FORBIDDEN", "Only the owner can change this listing.");
  }
  return { viewer, tool };
}

/**
 * Caller must be a party to the loan. `as` narrows it to one side (only the
 * lender approves; only the borrower cancels). `allowAdmin` permits read access for admins.
 */
export async function requireLoanParty(
  ctx: Ctx,
  loanId: Id<"loans">,
  opts: { as?: "lender" | "borrower"; allowAdmin?: boolean } = {},
): Promise<{ viewer: Viewer; loan: Doc<"loans">; role: LoanRole }> {
  const viewer = await requireUser(ctx);
  const loan = await ctx.db.get(loanId);
  if (!loan) throw appError("NOT_FOUND", "That request doesn't exist.");

  const me = viewer.user._id;
  const role: LoanRole | null =
    loan.lenderId === me ? "lender" : loan.borrowerId === me ? "borrower" : null;

  if (role && (!opts.as || opts.as === role)) return { viewer, loan, role };
  if (!opts.as && opts.allowAdmin && viewer.isAdmin) return { viewer, loan, role: "admin" };
  throw appError("FORBIDDEN", "You can't do that on this request.");
}
