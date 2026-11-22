# LendLoop security (v1)

This file was written **before any feature code**. Every later change must follow it. If a rule has to be broken, stop and write down why in DOCUMENTATION.md first.

> **Status:** v1 = rules and plan. The "Where it lives" column is filled in as code is built. **Built** marks code that exists and has tests; anything else is still planned.

## Why an employer handling sensitive data should care
Fluence holds data about clinicians: identity, professional history, course progress, and AI prompts. A tool-lending app is low-stakes, but the habits are the same ones that protect health-adjacent data:
- the server decides who can do what,
- systems only share what they must,
- every important action leaves a trace,
- nothing fails quietly.

The point of this file is to show those habits on a small project, so they can be checked line by line.

## Words used here
- **Authorization (authz):** checking whether this person is *allowed* to do this action. Different from authentication: checking *who* they are, which Clerk does.
- **IDOR:** Insecure Direct Object Reference, when someone changes an ID in a request to act on another person's data.
- **HMAC:** a signature made from the message plus a shared secret. Only someone with the secret can make a valid one.
- **Replay:** re-sending a real, previously valid message to trigger the action again.
- **Idempotent:** doing the same thing twice has the same effect as doing it once.
- **Constant-time compare:** comparing two strings in a way that takes the same time whether they match early or late, so timing doesn't leak the secret.

## The rules

| # | Rule | How it will be done | Where it lives |
|---|---|---|---|
| 1 | **Authorization lives in Convex.** Every query and mutation checks identity, role and ownership on the server. UI hiding is cosmetic only. Deny by default. | Helpers `requireUser`, `requireAdmin`, `requireToolOwner`, `requireLoanParty`. Every public function calls one first; the only exceptions are `tools.publicList` and `users.me` (returns `null` when signed out). Admin role comes from the Clerk JWT claim (exact match `"admin"`), never from client input. `users.store` takes no arguments: name and email come only from the verified token. | **Built:** `convex/lib/auth.ts`, `convex/users.ts`, `convex/tools.ts`, `convex/loans.ts`, `convex/admin.ts`; tests in `convex/auth.test.ts`, `tools.test.ts`, `loans.test.ts`, `admin.test.ts` |
| 2 | **Least privilege and data minimization.** | `tools.publicList` returns only `{_id, name, category}` (a test checks the exact keys). Counterparty email is shown only while a loan is approved and not yet returned. Webhook payload: `eventId, type, recipientEmail, recipientFirstName, toolName, startDate, endDate, status`. Logs use IDs, never emails. | **Built:** field picking in `convex/lib/views.ts` (contact email only via `contactAllowed`, never for admins); tests on exact public keys and no `@` in feed/admin/declined responses. Planned: webhook payload in `convex/notify.ts` |
| 3 | **Signed webhooks, both directions.** HMAC-SHA256 over `timestamp.body`, reject if the timestamp is more than 5 minutes off (blocks replay), constant-time compare. | Convex → n8n: header `X-LendLoop-Signature: t=…,v1=…`, verified in an n8n Code node. n8n → Convex: same scheme, verified in the Convex `httpAction`. Fails closed if the secret is missing or under 32 characters. | **Built:** `convex/lib/hmac.ts` + `hmac.test.ts`; Convex → n8n in `convex/notify.ts` (body `{"payload":"<string>"}`, signed `t.payload` so n8n checks the exact bytes); n8n → Convex in `convex/http.ts` (+ `n8n.test.ts`). n8n side: Crypto node + constant-time Code node in `n8n/workflows/request-notification.json`. Checked live 21 Nov: wrong key → 401 |
| 4 | **Secrets** only in env vars and n8n credentials. | `.env.example` lists names with empty values. Convex holds `LENDLOOP_WEBHOOK_SECRET` + `N8N_NOTIFY_URL` as deployment env vars. n8n Cloud blocks `$env`, so the same secret lives in the n8n Crypto credential "LendLoop webhook secret"; Gmail sends through an OAuth credential. Exports carry only credential names/ids. Before export, scan the workflow JSON for the real secret and key patterns. Secrets never get printed in chat or logs. | Convex env, n8n credentials, `.env.example`; scan run 21 Nov over `n8n/workflows/*.json` (clean) |
| 5 | **Idempotency** on every write-back. | Reminder key = `loanId:YYYY-MM-DD`; a unique lookup on `automationEvents.idempotencyKey` means a retry updates the existing row, and `sent` is final. Notification key = `eventId`, remembered in the n8n Data Table `lendloop_sent_events`; a repeat gets `{"status":"duplicate"}` and no second email. | **Built:** `convex/automation.ts`, `n8n/workflows/*.json`; checked live 21 Nov (signed replay → duplicate) |
| 6 | **Failure visibility.** | Convex outbox retries with exponential backoff (5 tries) then marks `failed`. n8n nodes use "retry on fail". An n8n error workflow posts a signed failure report to Convex. Admin view lists failed automations. | **Built:** `convex/notify.ts`, `convex/http.ts` (`/n8n/automation-failure` → `workflowErrors`), `admin.failedAutomations`, `n8n/workflows/error-handler.json` (linked as error workflow on both others) |
| 7 | **Input validation** on every argument. | Convex `v.*` validators plus explicit checks: name ≤ 60 chars, description ≤ 280, category/condition enums, start ≥ today, end > start, loan ≤ 30 days. Text is stripped of control characters and Unicode direction overrides (text that displays differently from what is stored). Bad input throws a clear error with a field name. | **Built:** `convex/lib/validate.ts`, `convex/lib/validators.ts` + `validate.test.ts` |
| 8 | **Abuse limits.** | Inside mutations: ≤ 20 active listings per user, ≤ 10 pending requests per user, ≤ 30 requests per day (rolling 24 h). Client page size capped at 50. | **Built:** `convex/lib/limits.ts`, tests in `tools.test.ts` / `loans.test.ts` |
| 9 | **Audit log** for approve, decline, return, listing removal, Trusted Lender changes. | `auditLog` row: actor ID, action, target, time, and a short admin reason for removals. No emails. Admin can view. | **Built:** `convex/lib/audit.ts`, written by `loans.approve/decline/markReturned`, `tools.remove`, `admin.removeListing/setTrustedLender`; read by `admin.auditLog`, shown in the admin console "Audit log" tab (Phase 7) |
| 10 | **Safe defaults.** | No user is admin by default. Admin is set by hand in Clerk (`publicMetadata.role`). No debug or seed endpoints exposed over HTTP; seed scripts are `internal` functions only. Clerk `convex` JWT template carries only `aud`, `email`, `email_verified`, `given_name`, `role`, and lives 5 minutes, so a removed admin loses the role within 5 minutes. | **Built:** Clerk app "LendLoop" (email code + Google, no passwords, first name required), `convex/auth.config.ts` |
| 11 | **Web basics (OWASP mindset).** | React escaping only (no `dangerouslySetInnerHTML`). Security headers in `next.config.ts`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. Only public keys use the `NEXT_PUBLIC_` prefix. `proxy.ts` sends signed-out visitors to sign-in for signed-in pages (convenience; Convex is the real check). | **Built:** `next.config.ts`: CSP with exact Clerk + Convex origins (no nonce, because PPR can't use per-request nonces: `'unsafe-inline'` scripts is the trade-off, D22), frame-ancestors none, HSTS, no `X-Powered-By`; `proxy.ts`. Checked 21 Nov: no CSP violations |

## Threat table

| Threat | Example | Defence | How it is tested |
|---|---|---|---|
| **Unauthorized loan action (IDOR)** | User B calls `loans.approve` with the ID of a loan on User A's tool. | Rule 1: `requireLoanParty` + lender check in the mutation. Status checks (only `pending` can be approved). | convex-test: wrong user → throws; wrong status → throws. |
| **Forged webhook** | Someone POSTs a fake "reminder sent" to the Convex HTTP endpoint, or a fake request event to n8n. | Rule 3: HMAC with the shared secret; bad signature → 401. | Unit test: valid / tampered body / wrong secret. |
| **Replayed webhook** | An attacker re-sends a captured, valid request a day later. | Timestamp window (±5 min) + idempotency key. | Unit test: old timestamp → rejected. |
| **Leaked secret** | The webhook secret or Gmail token ends up in exported workflow JSON or in git. | Rule 4: env/credentials only, pre-export scan, `.gitignore` for `.env*` except `.env.example`. | Scan script run before submission (checklist). |
| **Duplicate reminder** | n8n retries after a timeout, so the borrower gets two emails and Convex gets two rows. | Rule 5: one row per `loanId:date`. The workflow checks "already sent today" before emailing. | convex-test: same key twice → one row. |
| **Silent failure** | Gmail is down, no one notices. | Rule 6: retries, error workflow, `failed` status in admin view. | convex-test: 5 failed tries → `failed`, shown to admins; live: error handler wired to both workflows. |
| **Data over-exposure** | Public page or API shows owner names or emails. | Rule 2: explicit field picking, not returning whole documents. | convex-test: exact key set of `publicList`; contact query denied unless approved. |
| **Spam / abuse** | A script creates 1,000 listings. | Rule 8: per-user caps. | convex-test: 21st listing → throws. |
| **Stale or faked admin role** | An admin is demoted but keeps acting; or someone sends `role: "Admin"`. | Role read only from the Clerk-signed JWT, exact match `"admin"`; tokens live 5 minutes. | convex-test: `"Admin"`, `"admin "`, `true`, `["admin"]`, `null` all → not admin. |
| **Spoofed text** | A listing name uses Unicode direction overrides to look like something else. | Rule 7: control and bidi characters stripped before saving. | Unit test in `validate.test.ts`. |

## Known limits (honest)
- The CSP allows inline scripts because Partial Prerendering can't use per-request nonces (D22).
- The project folder is not a git repository yet, so `.gitignore` is untested in practice: check `git status` shows no `.env.local` before the first commit.
- The HMAC secret is shared by both directions. Production would use one per direction and rotate them (see production note).
- Rate caps are simple counters, not a sliding-window limiter.
- Email goes out through one personal Gmail account (OAuth): fine for a demo, but Gmail has daily send limits and no domain authentication of our own. Production would use a transactional provider with a verified domain.
- n8n keeps no data for successful runs (by design), so a sent email is proven by the outbox `sent` status and the Data Table row, not by n8n's execution list.
- No external penetration test; this is self-review plus automated tests.

## Security checklist (tick before submitting)
- [x] Every exported Convex query/mutation calls an auth helper (except `tools.publicList`) (21 Nov: scripted scan of 25 public functions; seed and n8n handlers are internal; HTTP routes all go through `readSigned`)
- [x] Tests cover: wrong-user actions, admin-only actions, public field set, date validation, rate caps, idempotency, HMAC good/bad/expired (85 tests)
- [x] `npm run lint`, `typecheck`, `test`, `build` all pass (21 Nov)
- [x] Secret scan over repo + `n8n/workflows/*.json` finds nothing (21 Nov: 133 files checked for the real webhook secret and Clerk secret key, plus 6 key patterns; `.env.local` excluded and git-ignored)
- [x] `.env.example` has names only, no values
- [x] No `console.log` of emails, tokens or full payloads (no `console.*` in app or Convex code at all)
- [x] First sign-in is a normal user (`users.store` sets no role; role only from the exact JWT claim, tested; Jonah and Priya get "only for admins" in the browser)
- [x] Security headers present (21 Nov: CSP and the rest read from the live response)
- [x] Error workflow fires and the failed state shows in the admin view (21 Nov: forced Gmail failure → `workflowErrors` row; admin screen shows it once Phase 7 wires the UI)
- [x] README explains the data-minimization choices (README "Data minimization" table)
