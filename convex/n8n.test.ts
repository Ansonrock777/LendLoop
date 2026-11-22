import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { signPayload, verifySignature } from "./lib/hmac";
import { MAX_ATTEMPTS } from "./notify";
import { day, world, type T } from "./test.fixtures";

// Test-only value, not a real secret.
const SECRET = "test-secret-0123456789abcdef0123456789";
const URL = "https://n8n.example.test/webhook/lendloop-notify";

type Sent = { url: string; signature: string | null; body: string };

function stubFetch(status = 200): Sent[] {
  const sent: Sent[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    sent.push({
      url,
      signature: new Headers(init.headers).get("X-LendLoop-Signature"),
      body: String(init.body),
    });
    return new Response("{}", { status });
  });
  return sent;
}

async function settle(t: T) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

async function outbox(t: T) {
  return await t.run((ctx) => ctx.db.query("outbox").take(20));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("LENDLOOP_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("N8N_NOTIFY_URL", URL);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("outbox delivery to n8n", () => {
  test("sends a signed, minimal payload to the lender and marks it sent", async () => {
    const sent = stubFetch(200);
    const { t, as, toolId } = await world();
    await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(3) });
    await settle(t);

    expect(sent).toHaveLength(1);
    const { payload } = JSON.parse(sent[0].body) as { payload: string };
    // n8n verifies the exact payload string against the header.
    expect(await verifySignature(SECRET, payload, sent[0].signature, Date.now())).toEqual({ ok: true });
    const data = JSON.parse(payload);
    expect(Object.keys(data).sort()).toEqual(
      ["endDate", "eventId", "otherFirstName", "recipientEmail", "recipientFirstName", "startDate", "toolName", "type"].sort(),
    );
    expect(data).toMatchObject({ type: "request_created", recipientEmail: "sam@example.test", otherFirstName: "Maya" });
    expect(await outbox(t)).toMatchObject([{ status: "sent", attempts: 1 }]);
  });

  test("the answer goes to the borrower", async () => {
    const sent = stubFetch(200);
    const { t, as, toolId } = await world();
    const loanId = await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(3) });
    await as.lender.mutation(api.loans.approve, { loanId });
    await settle(t);
    const types = sent.map((s) => JSON.parse(JSON.parse(s.body).payload));
    expect(types.find((p) => p.type === "request_approved")?.recipientEmail).toBe("maya@example.test");
  });

  test("retries with backoff, then fails visibly after 5 tries without leaking details", async () => {
    const sent = stubFetch(500);
    const { t, as, toolId } = await world();
    await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(3) });
    await settle(t);
    expect(sent).toHaveLength(MAX_ATTEMPTS);
    const [row] = await outbox(t);
    expect(row).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS, lastError: "n8n answered with an error (500)." });
    const failed = await as.admin.query(api.admin.failedAutomations, {});
    expect(failed).toMatchObject([{ type: "request_created", toolName: "Cordless drill" }]);
    expect(JSON.stringify(failed)).not.toContain("@");
  });

  test("fails closed when the secret or URL is missing", async () => {
    vi.stubEnv("LENDLOOP_WEBHOOK_SECRET", "");
    const sent = stubFetch(200);
    const { t, as, toolId } = await world();
    await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(3) });
    await settle(t);
    expect(sent).toHaveLength(0);
    expect((await outbox(t))[0]).toMatchObject({ status: "failed", lastError: "Automation isn't configured yet." });
  });

  test("a missing address fails at once instead of retrying", async () => {
    const sent = stubFetch(200);
    const { t, as, toolId } = await world();
    await t.run(async (ctx) => {
      const lender = (await ctx.db.query("users").take(10)).find((u) => u.firstName === "Sam")!;
      await ctx.db.patch(lender._id, { email: "" });
    });
    await as.borrower.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(3) });
    await settle(t);
    expect(sent).toHaveLength(0);
    expect((await outbox(t))[0]).toMatchObject({ status: "failed", attempts: 1 });
  });
});

/* ---------- Signed HTTP endpoints ---------- */

async function call(t: T, path: string, body: unknown, opts: { secret?: string; at?: number; header?: string | null } = {}) {
  const raw = JSON.stringify(body);
  const signature =
    opts.header !== undefined ? opts.header : await signPayload(opts.secret ?? SECRET, raw, opts.at ?? Date.now());
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature) headers["X-LendLoop-Signature"] = signature;
  return await t.fetch(path, { method: "POST", headers, body: raw });
}

async function overdueLoan() {
  const w = await world();
  const loanId = await w.as.borrower.mutation(api.loans.request, { toolId: w.toolId, startDate: day(1), endDate: day(3) });
  await w.as.lender.mutation(api.loans.approve, { loanId });
  await w.t.run((ctx) => ctx.db.patch(loanId, { startDate: day(-6), endDate: day(-2) }));
  return { ...w, loanId };
}

describe("n8n → Convex endpoints", () => {
  test("reject missing, wrong, tampered and replayed signatures; fail closed without a secret", async () => {
    stubFetch(200);
    const { t } = await world();
    expect((await call(t, "/n8n/overdue-loans", {}, { header: null })).status).toBe(401);
    expect((await call(t, "/n8n/overdue-loans", {}, { secret: SECRET + "x" })).status).toBe(401);
    expect((await call(t, "/n8n/overdue-loans", {}, { at: Date.now() - 10 * 60_000 })).status).toBe(401);
    const good = await signPayload(SECRET, "{}", Date.now());
    expect((await call(t, "/n8n/overdue-loans", { extra: 1 }, { header: good })).status).toBe(401);
    vi.stubEnv("LENDLOOP_WEBHOOK_SECRET", "");
    expect((await call(t, "/n8n/overdue-loans", {})).status).toBe(503);
  });

  test("overdue-loans lists only overdue loans, with the borrower's email and nothing else personal", async () => {
    stubFetch(200);
    const { t, loanId } = await overdueLoan();
    const res = await call(t, "/n8n/overdue-loans", {});
    expect(res.status).toBe(200);
    const data = (await res.json()) as { day: string; reminders: Record<string, unknown>[] };
    expect(data.reminders).toHaveLength(1);
    expect(data.reminders[0]).toMatchObject({
      loanId,
      idempotencyKey: `${loanId}:${data.day}`,
      recipientEmail: "maya@example.test",
      lenderFirstName: "Sam",
      daysOverdue: 2,
    });
    expect(JSON.stringify(data)).not.toContain("sam@example.test");
  });

  test("reminder-status is idempotent per key, and 'sent' is final", async () => {
    stubFetch(200);
    const { t, loanId } = await overdueLoan();
    const { day: today } = (await (await call(t, "/n8n/overdue-loans", {})).json()) as { day: string };
    const key = `${loanId}:${today}`;
    expect((await call(t, "/n8n/reminder-status", { idempotencyKey: key, loanId, status: "failed", detail: "Timeout" })).status).toBe(200);
    expect((await call(t, "/n8n/reminder-status", { idempotencyKey: key, loanId, status: "sent" })).status).toBe(200);
    expect((await call(t, "/n8n/reminder-status", { idempotencyKey: key, loanId, status: "sent" })).status).toBe(200);
    expect((await call(t, "/n8n/reminder-status", { idempotencyKey: key, loanId, status: "failed" })).status).toBe(200);
    const rows = await t.run((ctx) => ctx.db.query("automationEvents").take(10));
    expect(rows).toMatchObject([{ idempotencyKey: key, status: "sent" }]);
    // Already reminded today: not listed again.
    const again = (await (await call(t, "/n8n/overdue-loans", {})).json()) as { reminders: unknown[] };
    expect(again.reminders).toHaveLength(0);
  });

  test("reminder-status rejects keys that don't match the loan, bad ids and bad status", async () => {
    stubFetch(200);
    const { t, loanId } = await overdueLoan();
    const bad = [
      { idempotencyKey: `other:${day(0)}`, loanId, status: "sent" },
      { idempotencyKey: `${loanId}:not-a-day`, loanId, status: "sent" },
      { idempotencyKey: `${loanId}:${day(0)}`, loanId: "nope", status: "sent" },
      { idempotencyKey: `${loanId}:${day(0)}`, loanId, status: "done" },
    ];
    for (const body of bad) expect((await call(t, "/n8n/reminder-status", body)).status).toBe(400);
    expect(await t.run((ctx) => ctx.db.query("automationEvents").take(10))).toHaveLength(0);
  });

  test("automation-failure is stored, cleaned and shown to admins", async () => {
    stubFetch(200);
    const { t, as } = await world();
    const res = await call(t, "/n8n/automation-failure", {
      workflow: "LendLoop overdue reminders",
      executionId: 123,
      message: "Gmail quota hit‮ " + "x".repeat(500),
    });
    expect(res.status).toBe(200);
    const failed = await as.admin.query(api.admin.failedAutomations, {});
    expect(failed[0]).toMatchObject({ type: "workflow", toolName: "LendLoop overdue reminders" });
    expect(failed[0].error.length).toBeLessThanOrEqual(200);
    expect(failed[0].error).not.toContain("‮");
  });
});
