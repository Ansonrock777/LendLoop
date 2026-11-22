import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireIdentity } from "./lib/auth";
import { cleanFirstName } from "./lib/validate";

/**
 * Creates or refreshes the caller's user row from their signed Clerk token.
 * Takes no arguments on purpose: name and email come only from the verified
 * identity, so a caller can't create or edit someone else's profile.
 */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const firstName = cleanFirstName(identity.givenName);
    const email = identity.emailVerified === false ? "" : (identity.email ?? "").slice(0, 254);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      if (existing.firstName !== firstName || existing.email !== email) {
        await ctx.db.patch(existing._id, { firstName, email });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      firstName,
      email,
      isTrustedLender: false,
    });
  },
});

/** What the signed-in shell needs about the caller. No email: the UI never needs it. */
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ firstName: v.string(), isAdmin: v.boolean(), isTrustedLender: v.boolean() }),
  ),
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;
    return {
      firstName: viewer.user.firstName,
      isAdmin: viewer.isAdmin,
      isTrustedLender: viewer.user.isTrustedLender,
    };
  },
});
