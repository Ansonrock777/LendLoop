import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { LIMITS } from "./lib/domain";
import { DRILL, codeOf, day, fieldOf, world } from "./test.fixtures";

async function requested() {
  const w = await world();
  const loanId = await w.as.borrower.mutation(api.loans.request, { toolId: w.toolId, startDate: day(1), endDate: day(3) });
  return { ...w, loanId };
}

describe("loans.request", () => {
  test("validates dates on the server", async () => {
    const { as, toolId } = await world();
    const ask = (startDate: string, endDate: string) => as.borrower.mutation(api.loans.request, { toolId, startDate, endDate });
    expect(await fieldOf(ask(day(-3), day(1)))).toBe("start");
    expect(await fieldOf(ask(day(2), day(2)))).toBe("end");
    expect(await fieldOf(ask(day(1), day(32)))).toBe("end");
    expect(await fieldOf(ask("next week", day(2)))).toBe("start");
  });

  test("can't borrow your own tool, a removed tool, or ask twice", async () => {
    const { as, toolId, loanId } = await requested();
    expect(loanId).toBeTruthy();
    const again = { toolId, startDate: day(5), endDate: day(6) };
    expect(await codeOf(as.lender.mutation(api.loans.request, again))).toBe("INVALID");
    expect(await codeOf(as.borrower.mutation(api.loans.request, again))).toBe("CONFLICT");
    const other = await as.lender.mutation(api.tools.create, DRILL);
    await as.lender.mutation(api.tools.remove, { toolId: other });
    expect(await codeOf(as.borrower.mutation(api.loans.request, { ...again, toolId: other }))).toBe("NOT_FOUND");
  });

  test("dates that clash with an approved loan are refused", async () => {
    const { as, toolId, loanId } = await requested();
    await as.lender.mutation(api.loans.approve, { loanId });
    // Day 3 is the handover day of the approved loan: inclusive overlap.
    expect(await codeOf(as.stranger.mutation(api.loans.request, { toolId, startDate: day(3), endDate: day(5) }))).toBe(
      "CONFLICT",
    );
    expect(await codeOf(as.stranger.mutation(api.loans.request, { toolId, startDate: day(4), endDate: day(5) }))).toBe(
      "OK",
    );
  });

  test("the 11th pending request is refused", async () => {
    const { as } = await world();
    const ids: Id<"tools">[] = [];
    for (let i = 0; i <= LIMITS.maxPendingRequestsPerUser; i++) ids.push(await as.lender.mutation(api.tools.create, DRILL));
    for (let i = 0; i < LIMITS.maxPendingRequestsPerUser; i++) {
      await as.borrower.mutation(api.loans.request, { toolId: ids[i], startDate: day(1), endDate: day(2) });
    }
    const last = ids[LIMITS.maxPendingRequestsPerUser];
    expect(await codeOf(as.borrower.mutation(api.loans.request, { toolId: last, startDate: day(1), endDate: day(2) }))).toBe(
      "RATE_LIMITED",
    );
  });

  test("more than 30 requests in a day is refused, even if cancelled", async () => {
    const { as } = await world();
    const tools: Id<"tools">[] = [];
    for (let i = 0; i < 16; i++) tools.push(await as.lender.mutation(api.tools.create, DRILL));
    for (let i = 0; i < 16; i++) tools.push(await as.stranger.mutation(api.tools.create, DRILL));
    for (let i = 0; i < LIMITS.maxRequestsPerDay; i++) {
      const loanId = await as.borrower.mutation(api.loans.request, { toolId: tools[i], startDate: day(1), endDate: day(2) });
      await as.borrower.mutation(api.loans.cancel, { loanId });
    }
    const next = { toolId: tools[LIMITS.maxRequestsPerDay], startDate: day(1), endDate: day(2) };
    expect(await codeOf(as.borrower.mutation(api.loans.request, next))).toBe("RATE_LIMITED");
  });

  test("queues a request notification in the same transaction", async () => {
    const { t, loanId } = await requested();
    const rows = await t.run((ctx) => ctx.db.query("outbox").take(10));
    expect(rows).toMatchObject([{ loanId, type: "request_created", status: "pending", attempts: 0 }]);
  });
});

describe("loan transitions: who may do what (IDOR)", () => {
  test("only the lender approves, declines or marks returned", async () => {
    const { as, loanId } = await requested();
    for (const fn of [api.loans.approve, api.loans.decline, api.loans.markReturned]) {
      expect(await codeOf(as.borrower.mutation(fn, { loanId }))).toBe("FORBIDDEN");
      expect(await codeOf(as.stranger.mutation(fn, { loanId }))).toBe("FORBIDDEN");
      expect(await codeOf(as.admin.mutation(fn, { loanId }))).toBe("FORBIDDEN");
    }
  });

  test("only the borrower cancels", async () => {
    const { as, loanId } = await requested();
    expect(await codeOf(as.lender.mutation(api.loans.cancel, { loanId }))).toBe("FORBIDDEN");
    expect(await codeOf(as.stranger.mutation(api.loans.cancel, { loanId }))).toBe("FORBIDDEN");
    expect(await codeOf(as.borrower.mutation(api.loans.cancel, { loanId }))).toBe("OK");
  });

  test("status rules: approve once, return only after approval, cancel only while pending", async () => {
    const { as, loanId } = await requested();
    expect(await codeOf(as.lender.mutation(api.loans.markReturned, { loanId }))).toBe("CONFLICT");
    expect(await codeOf(as.lender.mutation(api.loans.approve, { loanId }))).toBe("OK");
    expect(await codeOf(as.lender.mutation(api.loans.approve, { loanId }))).toBe("CONFLICT");
    expect(await codeOf(as.lender.mutation(api.loans.decline, { loanId }))).toBe("CONFLICT");
    expect(await codeOf(as.borrower.mutation(api.loans.cancel, { loanId }))).toBe("CONFLICT");
    expect(await codeOf(as.lender.mutation(api.loans.markReturned, { loanId }))).toBe("OK");
    expect(await codeOf(as.lender.mutation(api.loans.markReturned, { loanId }))).toBe("CONFLICT");
  });

  test("a second overlapping request can't also be approved", async () => {
    const { as, toolId, loanId } = await requested();
    const second = await as.stranger.mutation(api.loans.request, { toolId, startDate: day(2), endDate: day(4) });
    await as.lender.mutation(api.loans.approve, { loanId });
    expect(await codeOf(as.lender.mutation(api.loans.approve, { loanId: second }))).toBe("CONFLICT");
  });

  test("approve, decline and return are audited without emails", async () => {
    const { t, as, toolId, loanId } = await requested();
    await as.lender.mutation(api.loans.approve, { loanId });
    await as.lender.mutation(api.loans.markReturned, { loanId });
    const other = await as.stranger.mutation(api.loans.request, { toolId, startDate: day(5), endDate: day(6) });
    await as.lender.mutation(api.loans.decline, { loanId: other });
    const audit = await t.run((ctx) => ctx.db.query("auditLog").take(10));
    expect(audit.map((a) => a.action)).toEqual(["approve", "mark_returned", "decline"]);
    expect(JSON.stringify(audit)).not.toContain("@");
  });
});

describe("loan views and the contact window (D2)", () => {
  test("email appears only to the other party, only while approved", async () => {
    const { as, loanId } = await requested();
    const borrowerView = () => as.borrower.query(api.loans.get, { loanId });
    const lenderView = () => as.lender.query(api.loans.get, { loanId });

    expect((await borrowerView()).pickupEmail).toBeUndefined();
    expect((await lenderView()).pickupEmail).toBeUndefined();

    await as.lender.mutation(api.loans.approve, { loanId });
    expect((await borrowerView()).pickupEmail).toBe("sam@example.test");
    expect((await lenderView()).pickupEmail).toBe("maya@example.test");
    expect((await as.admin.query(api.loans.get, { loanId })).pickupEmail).toBeUndefined();
    const [listed] = await as.borrower.query(api.loans.myRequests, {});
    expect(listed.pickupEmail).toBe("sam@example.test");

    await as.lender.mutation(api.loans.markReturned, { loanId });
    expect((await borrowerView()).pickupEmail).toBeUndefined();
    expect((await lenderView()).pickupEmail).toBeUndefined();
  });

  test("declined loans never show an email", async () => {
    const { as, loanId } = await requested();
    await as.lender.mutation(api.loans.decline, { loanId });
    expect(JSON.stringify(await as.borrower.query(api.loans.myRequests, {}))).not.toContain("@");
  });

  test("strangers can't read a loan; admins read it with viewerRole admin", async () => {
    const { as, loanId } = await requested();
    expect(await codeOf(as.stranger.query(api.loans.get, { loanId }))).toBe("FORBIDDEN");
    expect((await as.admin.query(api.loans.get, { loanId })).viewerRole).toBe("admin");
  });

  test("lists split by side; overdue is derived from the end date", async () => {
    const { t, as, loanId } = await requested();
    await as.lender.mutation(api.loans.approve, { loanId });
    await t.run((ctx) => ctx.db.patch(loanId, { startDate: day(-5), endDate: day(-1) }));
    const [mine] = await as.borrower.query(api.loans.myRequests, {});
    expect(mine.status).toBe("overdue");
    expect(await as.borrower.query(api.loans.incoming, {})).toEqual([]);
    expect(await as.lender.query(api.loans.myRequests, {})).toEqual([]);
    expect((await as.lender.query(api.loans.incoming, {}))[0]._id).toBe(loanId);
  });

  test("loan page includes the queued notifications; pending count for the badge", async () => {
    const { as, loanId } = await requested();
    expect(await as.lender.query(api.loans.pendingIncomingCount, {})).toBe(1);
    await as.lender.mutation(api.loans.approve, { loanId });
    const view = await as.borrower.query(api.loans.get, { loanId });
    expect(view.automation?.map((a) => [a.kind, a.state])).toEqual([
      ["request-email", "queued"],
      ["decision-email", "queued"],
    ]);
    expect(await as.lender.query(api.loans.pendingIncomingCount, {})).toBe(0);
  });
});
