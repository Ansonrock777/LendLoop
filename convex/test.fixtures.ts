// Test-only fixtures. Two dots in the file name, so Convex never deploys it.
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { addDaysIso, todayIso } from "./lib/validate";
import schema from "./schema";
import { modules } from "./test.setup";

// Fake identities. tokenIdentifier is what Convex derives from the Clerk JWT (issuer|subject).
export const LENDER = { tokenIdentifier: "test|lender", givenName: "Sam", email: "sam@example.test", emailVerified: true };
export const BORROWER = { tokenIdentifier: "test|borrower", givenName: "Maya", email: "maya@example.test", emailVerified: true };
export const STRANGER = { tokenIdentifier: "test|stranger", givenName: "Lee", email: "lee@example.test", emailVerified: true };
export const ADMIN = { tokenIdentifier: "test|admin", givenName: "Ana", email: "ana@example.test", emailVerified: true, role: "admin" };

const makeTest = () => convexTest(schema, modules);
export type T = ReturnType<typeof makeTest>;

/** Day offsets from the real "today" (UTC), so date rules hold whenever tests run. */
export const day = (offset: number) => addDaysIso(todayIso(Date.now()), offset);

export const DRILL = { name: "Cordless drill", category: "power_tools", condition: "good", description: "18 V" } as const;

export async function world() {
  const t = makeTest();
  for (const who of [LENDER, BORROWER, STRANGER, ADMIN]) await t.withIdentity(who).mutation(api.users.store, {});
  const as = {
    lender: t.withIdentity(LENDER),
    borrower: t.withIdentity(BORROWER),
    stranger: t.withIdentity(STRANGER),
    admin: t.withIdentity(ADMIN),
  };
  const toolId = await as.lender.mutation(api.tools.create, DRILL);
  return { t, as, toolId };
}

/** Error code thrown by a promise, or "OK". */
export async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "OK";
  } catch (e) {
    const data = (e as { data?: { code?: string } }).data;
    if (data?.code) return data.code;
    throw e;
  }
}

/** Field name on an INVALID error. */
export async function fieldOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    return (e as { data?: { field?: string } }).data?.field;
  }
  throw new Error("expected an error");
}

export const page = (numItems = 12) => ({ paginationOpts: { numItems, cursor: null } });

export async function userId(t: T, token: string): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const u = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", token)).unique();
    return u!._id;
  });
}
