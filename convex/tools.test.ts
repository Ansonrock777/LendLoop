import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { LIMITS } from "./lib/domain";
import { DRILL, codeOf, day, fieldOf, page, world } from "./test.fixtures";

describe("tools.publicList (signed out)", () => {
  test("returns exactly id, name and category: no owner, description or condition", async () => {
    const { t } = await world();
    const result = await t.query(api.tools.publicList, page());
    expect(result.page).toHaveLength(1);
    expect(Object.keys(result.page[0]).sort()).toEqual(["_id", "category", "name"]);
  });

  test("hides removed tools and filters by category, newest first", async () => {
    const { t, as, toolId } = await world();
    await as.lender.mutation(api.tools.create, { ...DRILL, name: "Rake", category: "garden" });
    await as.lender.mutation(api.tools.create, { ...DRILL, name: "Mower", category: "garden" });
    await as.lender.mutation(api.tools.remove, { toolId });
    const all = await t.query(api.tools.publicList, page());
    expect(all.page.map((x) => x.name)).toEqual(["Mower", "Rake"]);
    const power = await t.query(api.tools.publicList, { ...page(), category: "power_tools" });
    expect(power.page).toHaveLength(0);
  });

  test("pages in batches and refuses oversized pages", async () => {
    const { t, as } = await world();
    for (let i = 0; i < 13; i++) await as.borrower.mutation(api.tools.create, { ...DRILL, name: `Tool ${i}` });
    const first = await t.query(api.tools.publicList, page(12));
    expect(first.page).toHaveLength(12);
    expect(first.isDone).toBe(false);
    const second = await t.query(api.tools.publicList, { paginationOpts: { numItems: 12, cursor: first.continueCursor } });
    expect(second.page).toHaveLength(2);
    expect(await codeOf(t.query(api.tools.publicList, page(51)))).toBe("INVALID");
    expect(await codeOf(t.query(api.tools.publicList, page(0)))).toBe("INVALID");
  });
});

describe("tools.listAvailable (signed in)", () => {
  test("requires sign-in", async () => {
    const { t } = await world();
    expect(await codeOf(t.query(api.tools.listAvailable, page()))).toBe("UNAUTHENTICATED");
  });

  test("shows lender first name and badge but never an email", async () => {
    const { as } = await world();
    const { page: rows } = await as.borrower.query(api.tools.listAvailable, page());
    expect(rows[0]).toMatchObject({ lenderFirstName: "Sam", lenderTrusted: false, isOwn: false, onLoanUntil: null });
    expect(JSON.stringify(rows)).not.toContain("@");
    const own = await as.lender.query(api.tools.listAvailable, page());
    expect(own.page[0].isOwn).toBe(true);
  });

  test("onLoanUntil is set once an approved loan has started", async () => {
    const { as, toolId } = await world();
    const loanId = await as.borrower.mutation(api.loans.request, { toolId, startDate: day(0), endDate: day(3) });
    await as.lender.mutation(api.loans.approve, { loanId });
    const { page: rows } = await as.stranger.query(api.tools.listAvailable, page());
    expect(rows[0].onLoanUntil).toBe(day(3));
  });
});

describe("tools.create / update / remove", () => {
  test("cleans text and validates lengths server-side", async () => {
    const { as } = await world();
    const id = await as.borrower.mutation(api.tools.create, { ...DRILL, name: "  Big‮   saw " });
    const mine = await as.borrower.query(api.tools.getMine, { toolId: id });
    expect(mine.name).toBe("Big saw");
    expect(await fieldOf(as.borrower.mutation(api.tools.create, { ...DRILL, name: "x".repeat(61) }))).toBe("name");
    expect(await fieldOf(as.borrower.mutation(api.tools.create, { ...DRILL, description: "x".repeat(281) }))).toBe(
      "description",
    );
  });

  test("rejects values outside the enums before the handler runs", async () => {
    const { as } = await world();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately bad input
    await expect(as.borrower.mutation(api.tools.create, { ...DRILL, category: "weapons" as any })).rejects.toThrow();
  });

  test("only the owner can update or remove; admin can't edit either", async () => {
    const { as, toolId } = await world();
    const edit = { toolId, ...DRILL, name: "Hacked" };
    expect(await codeOf(as.borrower.mutation(api.tools.update, edit))).toBe("FORBIDDEN");
    expect(await codeOf(as.admin.mutation(api.tools.update, edit))).toBe("FORBIDDEN");
    expect(await codeOf(as.borrower.mutation(api.tools.remove, { toolId }))).toBe("FORBIDDEN");
    expect(await codeOf(as.borrower.query(api.tools.getMine, { toolId }))).toBe("FORBIDDEN");
    expect(await codeOf(as.lender.mutation(api.tools.update, { ...edit, name: "Drill v2" }))).toBe("OK");
  });

  test("the 21st active listing is refused", async () => {
    const { as } = await world();
    for (let i = 0; i < LIMITS.maxActiveListingsPerUser; i++) {
      await as.borrower.mutation(api.tools.create, { ...DRILL, name: `Tool ${i}` });
    }
    expect(await codeOf(as.borrower.mutation(api.tools.create, DRILL))).toBe("RATE_LIMITED");
  });

  test("removing declines waiting requests, writes an audit row, and is blocked while lent out", async () => {
    const { t, as, toolId } = await world();
    const pending = await as.borrower.mutation(api.loans.request, { toolId, startDate: day(2), endDate: day(4) });
    await as.lender.mutation(api.tools.remove, { toolId });
    const after = await t.run((ctx) => ctx.db.get(pending));
    expect(after?.status).toBe("declined");
    const audit = await t.run((ctx) => ctx.db.query("auditLog").take(10));
    expect(audit.map((a) => a.action)).toContain("delete_listing");

    const tool2 = await as.lender.mutation(api.tools.create, DRILL);
    const loan = await as.borrower.mutation(api.loans.request, { toolId: tool2, startDate: day(1), endDate: day(2) });
    await as.lender.mutation(api.loans.approve, { loanId: loan });
    expect(await codeOf(as.lender.mutation(api.tools.remove, { toolId: tool2 }))).toBe("CONFLICT");
  });

  test("mine lists only the caller's tools with pending counts", async () => {
    const { as, toolId } = await world();
    await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(2) });
    expect(await as.lender.query(api.tools.mine, {})).toMatchObject([{ name: "Cordless drill", pendingRequests: 1 }]);
    expect(await as.borrower.query(api.tools.mine, {})).toEqual([]);
  });
});
