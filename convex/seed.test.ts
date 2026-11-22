import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { clear, run } from "./seed";
import { BORROWER, LENDER, page, world } from "./test.fixtures";

describe("seed", () => {
  test("creates ~40 tools, 8 demo neighbours, every loan state, and refuses to run twice", async () => {
    const { t } = await world();
    const result = await t.mutation(internal.seed.run, {
      realLenderEmails: [LENDER.email],
      realBorrowerEmails: [BORROWER.email],
    });
    expect(result).toEqual({ users: 8, tools: 40, loans: 19 });
    const statuses = new Set((await t.run((ctx) => ctx.db.query("loans").take(100))).map((l) => l.status));
    expect([...statuses].sort()).toEqual(["approved", "cancelled", "declined", "pending", "returned"]);
    await expect(t.mutation(internal.seed.run, {})).rejects.toThrow(/already/);
  });

  test("demo emails are .test only, and demo tokens can't match a real identity", async () => {
    const { t } = await world();
    await t.mutation(internal.seed.run, {});
    const demo = (await t.run((ctx) => ctx.db.query("users").take(100))).filter((u) => u.isDemo);
    expect(demo.every((u) => u.email.endsWith(".test") && u.tokenIdentifier.startsWith("demo|"))).toBe(true);
  });

  test("the real lender gets requests to answer; overdue shows up", async () => {
    const { t, as } = await world();
    await t.mutation(internal.seed.run, { realLenderEmails: [LENDER.email] });
    const incoming = await as.lender.query(api.loans.incoming, {});
    expect(incoming.map((l) => l.status).sort()).toEqual(["approved", "overdue", "pending", "pending", "returned"]);
  });

  test("two sets of real accounts each get their own tools and a full set of loans", async () => {
    const { t, as } = await world();
    const lender2 = { tokenIdentifier: "test|lender2", givenName: "Jo", email: "jo@example.test", emailVerified: true };
    const borrower2 = { tokenIdentifier: "test|borrower2", givenName: "Ravi", email: "ravi@example.test", emailVerified: true };
    for (const who of [lender2, borrower2]) await t.withIdentity(who).mutation(api.users.store, {});
    const result = await t.mutation(internal.seed.run, {
      realLenderEmails: [LENDER.email, lender2.email],
      realBorrowerEmails: [BORROWER.email, borrower2.email],
    });
    expect(result.loans).toBe(7 + 5 * 2 + 7 * 2);
    for (const lender of [as.lender, t.withIdentity(lender2)]) {
      expect((await lender.query(api.tools.mine, {})).length).toBeGreaterThanOrEqual(5);
      expect(await lender.query(api.loans.incoming, {})).toHaveLength(5);
    }
    for (const borrower of [as.borrower, t.withIdentity(borrower2)]) {
      const statuses = (await borrower.query(api.loans.myRequests, {})).map((l) => l.status).sort();
      expect(statuses).toEqual(["approved", "cancelled", "declined", "overdue", "pending", "pending", "returned"]);
    }
  });

  test("more than 2 real lenders or borrowers is refused", async () => {
    const { t } = await world();
    const three = [LENDER.email, BORROWER.email, "x@example.test"];
    await expect(t.mutation(internal.seed.run, { realLenderEmails: three })).rejects.toThrow(/At most 2/);
  });

  test("clear removes demo data and keeps real users and their own tools", async () => {
    const { t, as } = await world();
    await t.mutation(internal.seed.run, { realLenderEmails: [LENDER.email] });
    await t.mutation(internal.seed.clear, {});
    const { page: left } = await t.query(api.tools.publicList, page(50));
    expect(left.map((x) => x.name)).toEqual(["Cordless drill"]); // created by the fixture, not the seed
    const users = await t.run((ctx) => ctx.db.query("users").take(100));
    expect(users.some((u) => u.isDemo)).toBe(false);
    expect(await as.lender.query(api.loans.incoming, {})).toEqual([]);
  });

  test("seed functions are registered as internal, so clients can't call them", () => {
    for (const fn of [run, clear]) {
      expect(fn.isInternal).toBe(true);
      expect((fn as unknown as { isPublic?: boolean }).isPublic).toBeFalsy();
    }
  });
});
