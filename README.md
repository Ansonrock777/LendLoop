# LendLoop

A tool-lending board for one street. Neighbours list things they're happy to lend (a drill, a ladder, a tent), others ask for the days they need them, the owner says yes or no, and LendLoop handles the emails and the "it's overdue" reminder.

Built as a take-home for Fluence International. The focus is security-minded engineering and honest, psychology-informed design, not feature count.

**Stack:** Next.js 16 (App Router) · React 19 · Clerk (sign-in) · Convex (database + server functions) · n8n Cloud (automations) · Gmail via n8n · TypeScript · Tailwind 4 + shadcn/ui · Vitest + convex-test

---

## What it does

| Who | Can |
| --- | --- |
| Signed-out visitor | See the public board: tool **name and category only**. |
| Any signed-in neighbour | Browse with lender first name, condition and availability; list up to 20 tools; ask to borrow (1–30 days); cancel a pending request. |
| Lender | Approve, decline, mark returned. After approval both sides see each other's email to arrange pickup, and only until the tool is back. |
| Admin | See all loans (first names, never emails), remove a listing with a reason, give the Trusted Lender badge, read the audit log, see failed automations. |

Automations (n8n):
- **Request notification:** an email to the lender when someone asks, and to the borrower when the lender answers.
- **Overdue reminders:** every morning at 9:00, one friendly reminder per overdue loan.
- **Error handler:** if either workflow fails, a short report goes back to Convex and shows on the admin page.

---

## Architecture

```
Browser (Next.js, React)
  │  Clerk session ──► short-lived JWT (5 min, claims: email, first name, role)
  │
  ├──► Convex queries / mutations  ── every one checks identity + role + ownership
  │       │
  │       ├─ tables: users, tools, loans, auditLog, outbox, automationEvents, workflowErrors
  │       │
  │       └─ outbox row (same transaction as the change)
  │              │ scheduled action, signed HMAC, retries 1 / 5 / 15 / 60 min, then "failed"
  │              ▼
  │          n8n "Request notification" ── verifies signature ── Gmail ── remembers eventId
  │
  └──  n8n "Overdue reminders" (daily) ──signed──► Convex /n8n/overdue-loans
                                         ──signed──► Convex /n8n/reminder-status (idempotent)
       n8n "Error handler"              ──signed──► Convex /n8n/automation-failure
```

Code map:

| Path | What |
| --- | --- |
| `convex/` | Schema, queries, mutations, HTTP endpoints for n8n. `lib/auth.ts` (access checks), `lib/views.ts` (hand-picked return fields), `lib/validate.ts`, `lib/limits.ts`, `lib/hmac.ts`, `lib/notify.ts` (outbox). Tests sit next to the code as `*.test.ts`. |
| `app/` | Routes (thin). `(signed-in)/` is behind Clerk in `proxy.ts`. |
| `components/screens/` | One file per screen. |
| `components/app/` | LendLoop blocks (feed, loan rows, request dialog, query boundary). |
| `components/ui/` | shadcn/ui components (owned code). |
| `lib/` | `types.ts` (derived from Convex return types), `copy.ts` (every sentence), `errors.ts`, `format.ts`. |
| `n8n/workflows/` | Exported n8n workflows (no secrets; credentials referenced by name). |

---

## Running it locally

You need Node 20+, a Clerk account, a Convex account and (for emails) an n8n instance with a Gmail account.

1. **Install**
   ```bash
   npm install
   cp .env.example .env.local
   ```
2. **Convex:** `npx convex dev` creates a dev deployment and writes `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` into `.env.local`. Leave it running.
3. **Clerk:** create an application (email code + Google, first name required, no passwords). Then:
   - copy the publishable key and secret key into `.env.local`;
   - add a JWT template named `convex` with only these claims: `aud: "convex"`, `email`, `email_verified`, `given_name`, `role: {{user.public_metadata.role}}`, lifetime 300 s;
   - tell Convex who issues tokens:
     ```bash
     npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-instance>.clerk.accounts.dev
     ```
4. **Run the app:** `npm run dev` and open http://localhost:3000.
5. **Make someone admin (optional):** in Clerk, set that user's public metadata to `{"role": "admin"}`. Nobody is admin by default.
6. **Demo data (optional):** sign in once with each account you want to attach, then
   ```bash
   npx convex run seed:run '{"realLenderEmails":["<lender email>"],"realBorrowerEmails":["<borrower email>"]}'
   ```
   This adds 8 demo neighbours (`*.test` emails, which can't reach anyone), 40 tools and loans in every state. `npx convex run seed:clear` removes them. Both are internal functions, so the browser can't call them.

### Automations (n8n)

1. Generate a secret (64 hex characters) and set it, plus the webhook URL, on Convex:
   ```bash
   npx convex env set LENDLOOP_WEBHOOK_SECRET <secret>
   npx convex env set N8N_NOTIFY_URL https://<your-n8n>/webhook/lendloop-notify
   ```
2. In n8n, create two credentials:
   - **LendLoop webhook secret**, type *Crypto*, with the same secret in "HMAC secret";
   - **LendLoop Gmail**, type *Gmail OAuth2*, signed in with the sending account.
3. Create a Data Table `lendloop_sent_events` with string columns `eventId` and `type`.
4. Import the three files in `n8n/workflows/`, select the credentials and Data Table on the nodes that use them, and replace the Convex site URL (`https://<deployment>.convex.site`) in the HTTP nodes with your own.
5. Publish **Error handler** first, set it as the error workflow of the other two, then publish those.

Without steps 1–5 the app still works; notifications are kept and marked `failed` with "Automation isn't configured yet."

### Test accounts (development instance only)

Clerk development instances accept `+clerk_test` addresses with the fixed code **424242**, so reviewers can sign in without an inbox:

| Account | Email | Role |
| --- | --- | --- |
| Priya | `borrower+clerk_test@example.com` | borrower |
| Jonah | `lender+clerk_test@example.com` | lender |
| Ana | `admin+clerk_test@example.com` | admin |

This only works on the development instance, never in production.

### Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npx convex dev` | Convex dev deployment, live code push |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types, then `tsc` for the app and for `convex/` |
| `npm test` | Vitest + convex-test (85 tests) |
| `npm run build` | Production build |

---

## Environment variables

| Name | Where | Secret? | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | no | Convex client URL (reaches the browser) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `.env.local` | no | Convex HTTP endpoints base |
| `CONVEX_DEPLOYMENT` | `.env.local` | no | Which deployment the CLI targets |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | no | Clerk browser key |
| `CLERK_SECRET_KEY` | `.env.local` | **yes** | Clerk server key (Next.js server only) |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex env | no | Lets Convex verify Clerk tokens |
| `LENDLOOP_WEBHOOK_SECRET` | Convex env + n8n credential | **yes** | HMAC key for both directions |
| `N8N_NOTIFY_URL` | Convex env | no | n8n webhook for notifications |

Only `NEXT_PUBLIC_*` values reach the browser. `.env*` is git-ignored except `.env.example`, which has names only.

---

## Security, briefly

The full rules, threat table and checklist are in [SECURITY.md](SECURITY.md). The short version:

- **Access is decided on the server.** Every Convex function starts with an access check (`requireUser`, `requireAdmin`, `requireToolOwner`, `requireLoanParty`) and denies by default. The one exception is the public board, which returns three fields. Hiding buttons in the UI is cosmetic.
- **Admin comes only from the signed Clerk token**, compared exactly with `"admin"`. Tokens last 5 minutes, so a removed admin loses access quickly.
- **Signed webhooks both ways.** HMAC-SHA256 over `timestamp.body`, 5-minute window, constant-time comparison. Missing secret → requests are refused, never accepted.
- **Nothing is lost or sent twice.** Notifications are written in the same transaction as the change, retried with backoff, and deduplicated by event id. Reminders use one key per loan per day.
- **Failures are visible.** After 5 tries a notification is marked `failed`; broken n8n runs report back; admins see both.
- **Every argument is validated on the server:** lengths, enums, dates, and control or direction-override characters are stripped.
- **Abuse caps:** 20 listings, 10 pending requests and 30 requests per day per person; pages of at most 50.
- **Audit log** for approve, decline, return, listing removal and badge changes. First names in the admin view, no emails.
- **Browser hardening:** a CSP that allows only our own origin plus the exact Clerk and Convex hosts; `X-Frame-Options: DENY`, HSTS, `nosniff`, a strict referrer policy. React escaping only (no raw HTML).
- **Secrets** live in env vars and n8n credentials only, and were scanned for before export.

## Data minimization

The guiding question was "who needs this field, and when?"

| Data | Who sees it | Why |
| --- | --- | --- |
| Tool name + category | Everyone, signed out too | Enough to show the board is worth joining. |
| Condition, description, lender first name, Trusted badge, availability | Signed-in neighbours | Enough to decide whether to ask. |
| Email address | Only the other person on a loan, **only while it is approved and not yet returned** | Needed to arrange pickup, not before and not after. |
| Email in admin views | Nobody | Admins moderate; they aren't party to anyone's loan. |
| Email in notifications to n8n | The recipient's address only | n8n needs exactly one address to send one email. |
| n8n execution history | Not kept for successful runs | So addresses don't pile up in a third-party tool. Failure reports mask addresses. |
| Photos | Not supported | Phone photos can carry location data that reveals someone's home. |

There are no profile pages, no last names, no addresses and no phone numbers.

---

## Testing

85 tests run the real Convex functions in memory (convex-test). They focus on what could go wrong: someone acting on another person's loan, admin-only actions as a normal user, the exact public field set, date validation, rate caps, the email only appearing while approved, signature checks (good, tampered, expired, missing secret), retries and idempotent write-backs. The whole flow (request → email → approve → reminder → failure report) was also checked live against n8n Cloud and Gmail.

## Honest limits

- One HMAC secret is shared by both directions; production would use one per direction and rotate them.
- Emails go out through one Gmail account (fine for a demo; production needs a sending service with a verified domain).
- The CSP allows inline scripts, because Partial Prerendering can't use per-request nonces (see DOCUMENTATION.md D22).
- "Overdue" uses UTC days, so it can flip a few hours early or late for UK users in summer.
- Rate caps are simple counters, not a sliding-window limiter.
- No external penetration test: this is self-review plus automated tests.

More: [PRODUCTION.md](PRODUCTION.md) (what changes for production, including an AWS mapping), [DOCUMENTATION.md](DOCUMENTATION.md) (every decision and why), [DESIGN.md](DESIGN.md) (design system and microcopy).
