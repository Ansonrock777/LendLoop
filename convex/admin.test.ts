import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { LENDER, codeOf, day, fieldOf, page, userId, world } from "./test.fixtures";

describe("admin functions deny everyone but admins", () => {
  test("normal users and signed-out callers get FORBIDDEN / UNAUTHENTICATED", async () => {
    const { t, as, toolId } = await world();
    const lenderId = await userId(t, LENDER.tokenIdentifier);
    const calls = (who: typeof as.lender) => [
      who.query(api.admin.allLoans, page()),
      who.query(api.admin.listings, page()),
      who.query(api.admin.lenders, {}),
      who.query(api.admin.failedAutomations, {}),
      who.mutation(api.admin.setTrustedLender, { userId: lenderId, trusted: true }),
      who.mutation(api.admin.removeListing, { toolId, reason: "spam" }),
    ];
    for (const p of calls(as.lender)) expect(await codeOf(p)).toBe("FORBIDDEN");
    for (const p of calls(t as unknown as typeof as.lender)) expect(await codeOf(p)).toBe("UNAUTHENTICATED");
  });
});

describe("admin views", () => {
  test("allLoans shows every loan with first names and no emails, even when approved", async () => {
    const { as, toolId } = await world();
    const loanId = await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(2) });
    await as.lender.mutation(api.loans.approve, { loanId });
    const { page: rows } = await as.admin.query(api.admin.allLoans, page());
    expect(rows).toMatchObject([{ lenderFirstName: "Sam", borrowerFirstName: "Maya", status: "approved" }]);
    expect(JSON.stringify(rows)).not.toContain("@");
  });

  test("listings and lenders", async () => {
    const { as } = await world();
    const { page: listings } = await as.admin.query(api.admin.listings, page());
    expect(listings).toMatchObject([{ name: "Cordless drill", lenderFirstName: "Sam" }]);
    expect(await as.admin.query(api.admin.lenders, {})).toMatchObject([{ firstName: "Sam", listings: 1, trusted: false }]);
  });
});

describe("admin actions", () => {
  test("Trusted Lender: set and unset are audited; repeating is a no-op", async () => {
    const { t, as } = await world();
    const lenderId = await userId(t, LENDER.tokenIdentifier);
    await as.admin.mutation(api.admin.setTrustedLender, { userId: lenderId, trusted: true });
    await as.admin.mutation(api.admin.setTrustedLender, { userId: lenderId, trusted: true });
    const { page: feed } = await as.borrower.query(api.tools.listAvailable, page());
    expect(feed[0].lenderTrusted).toBe(true);
    await as.admin.mutation(api.admin.setTrustedLender, { userId: lenderId, trusted: false });
    const audit = await t.run((ctx) => ctx.db.query("auditLog").take(10));
    expect(audit.map((a) => [a.action, a.targetId])).toEqual([
      ["set_trusted", lenderId],
      ["unset_trusted", lenderId],
    ]);
  });

  test("removeListing needs a reason, cleans it, stores it in the audit log", async () => {
    const { t, as, toolId } = await world();
    expect(await fieldOf(as.admin.mutation(api.admin.removeListing, { toolId, reason: "  " }))).toBe("reason");
    expect(await fieldOf(as.admin.mutation(api.admin.removeListing, { toolId, reason: "r".repeat(141) }))).toBe("reason");
    await as.admin.mutation(api.admin.removeListing, { toolId, reason: " Not a tool‮ " });
    const [row] = await t.run((ctx) => ctx.db.query("auditLog").take(10));
    expect(row).toMatchObject({ action: "remove_listing", targetType: "tool", targetId: toolId, reason: "Not a tool" });
    const { page: trail } = await as.admin.query(api.admin.auditLog, page());
    expect(trail).toMatchObject([{ actorFirstName: "Ana", action: "remove_listing", reason: "Not a tool" }]);
    expect(await codeOf(as.lender.query(api.admin.auditLog, page()))).toBe("FORBIDDEN");
    expect((await t.query(api.tools.publicList, page())).page).toHaveLength(0);
    expect(await codeOf(as.admin.mutation(api.admin.removeListing, { toolId, reason: "again" }))).toBe("NOT_FOUND");
  });

  test("failedAutomations lists failed outbox rows and failed reminders", async () => {
    const { t, as } = await world();
    await t.mutation(internal.seed.run, {});
    const rows = await as.admin.query(api.admin.failedAutomations, {});
    expect(rows.map((r) => r.type).sort()).toEqual(["reminder", "request_created"]);
    expect(JSON.stringify(rows)).not.toContain("@");
  });
});
