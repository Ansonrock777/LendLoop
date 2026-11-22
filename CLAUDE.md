# LendLoop — project guide

Take-home for Fluence International (Full-Stack Developer contract). LendLoop is a neighbourhood tool-lending board with n8n automations.
Goals: show security-minded engineering and honest, psychology-informed design. Never invent research, citations or credentials.

**Rule:** before starting any task, read PLAN.md. Before finishing, update PLAN.md and DOCUMENTATION.md.

## Stack & commands
Next.js (App Router) · Clerk · Convex · n8n Cloud · Gmail (via n8n) · TypeScript · Tailwind · Vitest + convex-test

Commands:
- dev: `npm run dev` + `npx convex dev` (one-off deploy of Convex code: `npx convex dev --once`)
- n8n: hosted at `menino.app.n8n.cloud` (D21), edited through the n8n MCP; exports in `n8n/workflows/` (re-export + secret scan after any workflow change)
- lint: `npm run lint`
- types: `npm run typecheck` (runs `next typegen`, then tsc for the app and for `convex/`)
- test: `npm test` (Vitest + convex-test; tests live in `convex/**/*.test.ts`)
- build: `npm run build`

Conventions found in Phase 4:
- Next.js 16: route protection is `proxy.ts` (not `middleware.ts`); read `node_modules/next/dist/docs/` before Next-specific code.
- Clerk 7: `SignedIn`/`SignedOut` are gone; use `<Show>`.
- Convex (Phase 5): query results are built by hand-picked view helpers in `convex/lib/views.ts` (never return whole docs); caps in `lib/limits.ts`; notifications only via `lib/notify.ts` outbox rows; test fixtures in `convex/test.fixtures.ts`.
- Convex: every public function starts with a helper from `convex/lib/auth.ts`; errors use `appError(code, message, field?)` from `convex/lib/errors.ts`; text input goes through `convex/lib/validate.ts`; shared enums and limits live in `convex/lib/domain.ts`.
- UI (D17): shadcn/ui (Radix base, Nova preset) in `components/ui/` (owned code; add with `npx shadcn@4.23.0 add <name>`), LendLoop blocks in `components/app/`, screens in `components/screens/`, routes in `app/` are thin. Toasts via `toast` from `sonner`. Sentences live in `lib/copy.ts`.
- Data (Phase 7, D22): screens call Convex hooks directly; `lib/types.ts` derives types from the queries (`FunctionReturnType`), so never hand-write a view type. Show errors with `errorMessage(e)` from `lib/errors.ts`; wrap pages whose query can be refused in `<QueryBoundary key={id} notFound={…}>`. Signed-in pages render only after `users.me` returns a row (AppShell). Feeds and admin lists use `usePaginatedQuery` (max 50 per page server-side). The CSP in `next.config.ts` lists Clerk + Convex origins: add any new external host there.
- Design (D18): read DESIGN.md v3 before UI work. Colours only in `app/globals.css`; `cn` comes from `@/lib/utils` (configured for the custom text sizes, never import from "cn" directly); tool drawings via `<ToolArt name category />` from `components/tool-art`.
- Next 16 + `cacheComponents`: client hooks that read the URL (`usePathname`, `useParams`) need a `<Suspense>` above them on dynamic routes.
- Clerk app: "LendLoop" (dev instance `engaged-unicorn-2340`). Convex project: `lendloop` (team `anson-barreto`).
- n8n (Phase 6, D21): workflows Request notification `Ecaw6O46xXFQk1Gh`, Overdue reminders `PGvD0FUf2BavLQny`, Error handler `F3EQL7sW5TcN9Ab9` (set as `errorWorkflow` on the other two); Data Table `lendloop_sent_events`. Credentials "LendLoop webhook secret" (Crypto, same value as Convex `LENDLOOP_WEBHOOK_SECRET`) and "LendLoop Gmail" (OAuth, sends as ansonmbarreto7). n8n Cloud blocks `$env`, so secrets go in credentials. Convex → n8n signs `t.payload` inside `{"payload":"<string>"}`; n8n → Convex signs `t.rawBody`. Success executions are not saved, so prove delivery via outbox `sent` / Data Table rows. Never type secrets into web forms: put them on the clipboard for Anson to paste.
- Seed marks today's reminders as "sent" for overdue seed loans, so a reminder run on the seed day sends nothing by design.

## Project files
- **PLAN.md**: task list. Read before any task; update before finishing.
- **DOCUMENTATION.md**: decision log (why, psychology reason + confidence, security impact, risks). Add an entry for each meaningful decision.
- **SECURITY.md**: rules, implementation pointers, threat table, checklist. Read before touching auth, data or integrations.
- **DESIGN.md**: the complete design reference (identity, colour, type, layout, components, screens, copy, states, illustrations, accessibility). Read before UI work; update when a visual rule changes. It replaces the deleted UI_PROMPT.md.
- **README.md**: reviewer entry point (setup, env vars, architecture, security, data minimization). Keep commands and env vars in sync; never list Anson's own email addresses.
- **PRODUCTION.md**: production changes + AWS mapping (design, not experience; D9).
- **INTERVIEW_NOTES.md**: plain-language talking points. Update when a decision is worth explaining out loud.
- **Private, gitignored (never pushed):** PLAN.md, INTERVIEW_NOTES.md, application/ (job-application drafts). Listed in `.gitignore`; see DOCUMENTATION.md D25. Keep personal addresses out of anything that is pushed.

## Standing rules
- Ask before installing/removing deps, editing .env, CI/CD or deploy config, deleting files, big renames.
- Never commit/push unless asked that moment. Conventional Commits. No AI co-author lines.
- Explain trade-offs concisely; "just the answer" = terse.
- Run lint, typecheck, tests, build before calling work done; say honestly what couldn't run.

## Security rules (details: SECURITY.md)
1. Authz in Convex: identity + role + ownership on every function; deny by default.
2. Data minimization: public = name + category; payloads/logs carry only needed fields, no secrets.
3. Signed webhooks both ways: HMAC + timestamp + constant-time compare.
4. Secrets only in env/n8n credentials; .env.example; scan before export; never print secrets.
5. Idempotency key on every write-back.
6. No silent failures: retries with backoff, error workflow, visible failed state.
7. Validate every argument server-side (types, lengths, enums, dates).
8. Rate caps on listings and requests.
9. Audit log for approve/decline/remove/return/Trusted Lender.
10. Safe defaults: no auto-admin, no debug endpoints.
11. OWASP basics: escape text, secure headers, nothing secret in client bundle.
