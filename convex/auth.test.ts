import { convexTest } from "convex-test";
import type { UserIdentity } from "convex/server";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireLoanParty, requireToolOwner, requireUser } from "./lib/auth";
import schema from "./schema";
import { modules } from "./test.setup";

// Fake identities. tokenIdentifier is what Convex derives from the Clerk JWT (issuer|subject).
const LENDER = { tokenIdentifier: "test|lender", givenName: "Sam", email: "sam@example.test", emailVerified: true };
const BORROWER = { tokenIdentifier: "test|borrower", givenName: "Maya", email: "maya@example.test", emailVerified: true };
const STRANGER = { tokenIdentifier: "test|stranger", givenName: "Lee", email: "lee@example.test", emailVerified: true };
const ADMIN = { tokenIdentifier: "test|admin", givenName: "Ana", email: "ana@example.test", emailVerified: true, role: "admin" };

async function setup() {
  const t = convexTest(schema, modules);
  for (const who of [LENDER, BORROWER, STRANGER, ADMIN]) {
    await t.withIdentity(who).mutation(api.users.store, {});
  }
  const ids = await t.run(async (ctx) => {
    const byToken = async (token: string) =>
      (await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", token)).unique())!._id;
    const lenderId = await byToken(LENDER.tokenIdentifier);
    const borrowerId = await byToken(BORROWER.tokenIdentifier);
    const toolId = await ctx.db.insert("tools", {
      ownerId: lenderId,
      name: "Cordless drill",
      category: "power_tools",
      condition: "good",
      description: "",
      status: "active",
    });
    const removedToolId = await ctx.db.insert("tools", {
      ownerId: lenderId,
      name: "Old saw",
      category: "power_tools",
      condition: "worn",
      description: "",
      status: "removed",
    });
    const loanId = await ctx.db.insert("loans", {
      toolId,
      borrowerId,
      lenderId,
      startDate: "2026-11-21",
      endDate: "2026-11-23",
      status: "pending",
    });
    return { toolId, removedToolId, loanId };
  });
  return { t, ...ids };
}

/** Runs a helper as `who` and returns the error code it throws, or "OK". */
async function codeOf(
  t: ReturnType<typeof convexTest>,
  who: Partial<UserIdentity> | null,
  fn: Parameters<ReturnType<typeof convexTest>["run"]>[0],
): Promise<string> {
  const runner = who ? t.withIdentity(who) : t;
  try {
    await runner.run(fn);
    return "OK";
  } catch (e) {
    const data = (e as { data?: { code?: string } }).data;
    if (data?.code) return data.code;
    throw e;
  }
}

describe("users.store", () => {
  test("creates the row from the signed identity only, and doesn't duplicate", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(LENDER).mutation(api.users.store, {});
    await t.withIdentity({ ...LENDER, givenName: "Samuel" }).mutation(api.users.store, {});
    const rows = await t.run((ctx) => ctx.db.query("users").take(10));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstName: "Samuel", email: "sam@example.test", isTrustedLender: false });
  });

  test("signed-out callers can't create a user", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.store, {})).rejects.toThrow(/sign in/i);
  });

  test("an unverified email is not stored", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ ...LENDER, emailVerified: false }).mutation(api.users.store, {});
    const [row] = await t.run((ctx) => ctx.db.query("users").take(10));
    expect(row.email).toBe("");
  });
});

describe("users.me and the admin claim", () => {
  test("returns null when signed out, and never includes email", async () => {
    const { t } = await setup();
    expect(await t.query(api.users.me, {})).toBeNull();
    const me = await t.withIdentity(LENDER).query(api.users.me, {});
    expect(me).toEqual({ firstName: "Sam", isAdmin: false, isTrustedLender: false });
  });

  test("only an exact role of 'admin' counts", async () => {
    const t = convexTest(schema, modules);
    for (const role of ["Admin", "admin ", "administrator", true, ["admin"], null]) {
      const who = { ...STRANGER, tokenIdentifier: `test|role-${JSON.stringify(role)}`, role };
      await t.withIdentity(who).mutation(api.users.store, {});
      expect((await t.withIdentity(who).query(api.users.me, {}))?.isAdmin).toBe(false);
    }
    await t.withIdentity(ADMIN).mutation(api.users.store, {});
    expect((await t.withIdentity(ADMIN).query(api.users.me, {}))?.isAdmin).toBe(true);
  });
});

describe("requireUser / requireAdmin", () => {
  test("deny signed-out callers and callers with no user row", async () => {
    const { t } = await setup();
    expect(await codeOf(t, null, (ctx) => requireUser(ctx))).toBe("UNAUTHENTICATED");
    expect(await codeOf(t, { tokenIdentifier: "test|ghost" }, (ctx) => requireUser(ctx))).toBe("UNAUTHENTICATED");
  });

  test("requireAdmin denies normal users and allows admins", async () => {
    const { t } = await setup();
    expect(await codeOf(t, LENDER, (ctx) => requireAdmin(ctx))).toBe("FORBIDDEN");
    expect(await codeOf(t, ADMIN, (ctx) => requireAdmin(ctx))).toBe("OK");
  });
});

describe("requireToolOwner", () => {
  test("owner allowed, everyone else denied", async () => {
    const { t, toolId } = await setup();
    expect(await codeOf(t, LENDER, (ctx) => requireToolOwner(ctx, toolId))).toBe("OK");
    expect(await codeOf(t, BORROWER, (ctx) => requireToolOwner(ctx, toolId))).toBe("FORBIDDEN");
    expect(await codeOf(t, null, (ctx) => requireToolOwner(ctx, toolId))).toBe("UNAUTHENTICATED");
  });

  test("admins only pass when the action explicitly allows them", async () => {
    const { t, toolId } = await setup();
    expect(await codeOf(t, ADMIN, (ctx) => requireToolOwner(ctx, toolId))).toBe("FORBIDDEN");
    expect(await codeOf(t, ADMIN, (ctx) => requireToolOwner(ctx, toolId, { allowAdmin: true }))).toBe("OK");
  });

  test("removed tools are treated as not found, even for the owner", async () => {
    const { t, removedToolId } = await setup();
    expect(await codeOf(t, LENDER, (ctx) => requireToolOwner(ctx, removedToolId))).toBe("NOT_FOUND");
  });
});

describe("requireLoanParty", () => {
  test("each side can act only as itself", async () => {
    const { t, loanId } = await setup();
    const as = (role: "lender" | "borrower") => (ctx: Parameters<typeof requireLoanParty>[0]) =>
      requireLoanParty(ctx, loanId as Id<"loans">, { as: role });
    expect(await codeOf(t, LENDER, as("lender"))).toBe("OK");
    expect(await codeOf(t, BORROWER, as("borrower"))).toBe("OK");
    expect(await codeOf(t, BORROWER, as("lender"))).toBe("FORBIDDEN");
    expect(await codeOf(t, LENDER, as("borrower"))).toBe("FORBIDDEN");
  });

  test("strangers are denied; admins may read but never act as a party", async () => {
    const { t, loanId } = await setup();
    expect(await codeOf(t, STRANGER, (ctx) => requireLoanParty(ctx, loanId))).toBe("FORBIDDEN");
    expect(await codeOf(t, ADMIN, (ctx) => requireLoanParty(ctx, loanId))).toBe("FORBIDDEN");
    expect(await codeOf(t, ADMIN, (ctx) => requireLoanParty(ctx, loanId, { allowAdmin: true }))).toBe("OK");
    expect(
      await codeOf(t, ADMIN, (ctx) => requireLoanParty(ctx, loanId, { as: "lender", allowAdmin: true })),
    ).toBe("FORBIDDEN");
  });
});
