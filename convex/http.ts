/**
 * HTTP endpoints for n8n (SECURITY.md rule 3). Every request must carry
 *   X-LendLoop-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${rawBody}`>
 * made with LENDLOOP_WEBHOOK_SECRET. Bad or old signatures get 401, a missing
 * secret gets 503 (fail closed). Responses never echo the request or the reason
 * a signature failed beyond one word, and nothing here is logged with emails.
 */
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { SIGNATURE_HEADER, verifySignature } from "./lib/hmac";

const MAX_BODY = 10_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Signed = { ok: true; body: Record<string, unknown> } | { ok: false; response: Response };

async function readSigned(req: Request): Promise<Signed> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return { ok: false, response: json(413, { error: "too_large" }) };
  const check = await verifySignature(process.env.LENDLOOP_WEBHOOK_SECRET, raw, req.headers.get(SIGNATURE_HEADER), Date.now());
  if (!check.ok) {
    return check.reason === "misconfigured"
      ? { ok: false, response: json(503, { error: "not_configured" }) }
      : { ok: false, response: json(401, { error: "unauthorized" }) };
  }
  try {
    const body: unknown = raw.length ? JSON.parse(raw) : {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, response: json(400, { error: "bad_json" }) };
  }
}

const str = (x: unknown, max: number): string | null => (typeof x === "string" && x.length <= max ? x : null);

const http = httpRouter();

/** n8n's daily run asks which borrowers need a reminder today. */
http.route({
  path: "/n8n/overdue-loans",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signed = await readSigned(req);
    if (!signed.ok) return signed.response;
    return json(200, await ctx.runQuery(internal.automation.overdueReminders, {}));
  }),
});

/** Write-back after each reminder email: idempotent per `loanId:day`. */
http.route({
  path: "/n8n/reminder-status",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signed = await readSigned(req);
    if (!signed.ok) return signed.response;
    const b = signed.body;
    const idempotencyKey = str(b.idempotencyKey, 100);
    const loanId = str(b.loanId, 64);
    const status = b.status === "sent" || b.status === "failed" ? b.status : null;
    const detail = b.detail === undefined ? undefined : str(b.detail, 1000);
    if (!idempotencyKey || !loanId || !status || detail === null) return json(400, { error: "invalid" });
    const result = await ctx.runMutation(internal.automation.recordReminder, {
      idempotencyKey,
      loanId,
      status,
      ...(detail ? { detail } : {}),
    });
    return result === "ok" ? json(200, { ok: true }) : json(400, { error: "invalid" });
  }),
});

/** The n8n error workflow reports a broken run, so failures never stay silent (rule 6). */
http.route({
  path: "/n8n/automation-failure",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signed = await readSigned(req);
    if (!signed.ok) return signed.response;
    const b = signed.body;
    const workflow = str(b.workflow, 200);
    const message = str(b.message, 2000);
    const executionId = b.executionId === undefined ? undefined : str(String(b.executionId), 100);
    if (!workflow || !message || executionId === null) return json(400, { error: "invalid" });
    await ctx.runMutation(internal.automation.recordWorkflowError, {
      workflow,
      message,
      ...(executionId ? { executionId } : {}),
    });
    return json(200, { ok: true });
  }),
});

export default http;
