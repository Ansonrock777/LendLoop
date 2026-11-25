# LendLoop decision log

One entry per meaningful decision. Psychology confidence uses:
- **Strong:** well replicated, widely accepted.
- **Moderate:** good support, but effects depend on context.
- **Mixed:** studies disagree or replications failed.
- **Weak / inspiration only:** a useful way of thinking, not evidence.

---

### D1. Public page shows tool name and category only
- **Decision:** the signed-out page lists available tools by name and category. No owner, location, description or photos.
- **Why:** the spec requires it, and it makes data minimization easy to show and test.
- **Psychology:** *privacy as a trust signal*. Seeing that the app doesn't expose neighbours may make people more willing to list their own tools. Confidence: **weak / inspiration only**. It's a reasonable design idea, not a measured effect for this kind of app.
- **Security impact:** an outsider can't map who owns what. Enforced by explicit field picking in `tools.publicList` plus a test on the exact key set.
- **Could go wrong / later:** a sparse page may feel less useful. Could add an approximate "X tools in your area" count later.

### D2. Contact email shown only during an active approved loan
- **Decision:** both sides always see first names on their shared request. The email appears only to the other party while the loan is approved and not yet returned.
- **Why:** people need some way to arrange handover. Showing the email only when needed shrinks the window of exposure.
- **Psychology:** *trust and reciprocity*. A name makes it feel like lending to a neighbour, not a stranger. Confidence: **moderate** for reciprocity in general; untested here.
- **Security impact:** more personal data is exposed than with a first-name-only design. This is a deliberate trade-off. Enforced in a Convex query, not the UI.
- **Could go wrong / later:** someone can copy the email while it's visible, and that can't be undone. Production option: in-app messaging or relay addresses instead of real emails.
- **Update (Phase 4, Anson's call):** signed-in users also see a lender's **first name** on Browse cards and in the request dialog, as the Claude Design screens show. First name only, never surname or email, and never to signed-out visitors. Reason: it feels neighbourly and gives the Trusted Lender badge someone to belong to. Trade-off: any signed-in user can see which first name owns which tool.

### D3. Notifications by email via Resend, called from n8n
- **Decision:** n8n sends emails through Resend's HTTP API. The app itself has no email dependency.
- **Why:** email is realistic and Resend is simple. Keeping it in n8n keeps the app small and puts the secret in one place.
- **Psychology:** none.
- **Security impact:** the recipient's email must be in the webhook payload. The payload is cut to the minimum fields (SECURITY.md rule 2). The Resend key lives in an n8n credential.
- **Could go wrong / later:** the sandbox sender only delivers to the account owner, so the demo shows all mail landing in one inbox. Production needs a verified domain plus SPF/DKIM.

### D4. Admin role set by hand in Clerk, checked in Convex
- **Decision:** `publicMetadata.role = "admin"` is set in the Clerk dashboard and passed in the JWT. Convex checks it on every admin function.
- **Why:** the spec says the first user must not become admin automatically. A role set by hand outside the app can't be granted by a bug in the app.
- **Psychology:** none.
- **Security impact:** safe default, and the role can't be faked from the browser because the JWT is signed by Clerk.
- **Could go wrong / later:** after removing an admin, the role stays in already-issued tokens until they expire (short-lived by default). Role changes are audited in Clerk, not in the app's audit log.

### D5. Calm visual design: warm paper base, ink-blue primary, roomy spacing, light + dark
- **Decision:** see DESIGN.md.
- **Why:** users are neighbours of mixed ages, so readability comes first.
- **Psychology:** *cognitive load*: fewer things competing for attention leaves more mental room for the task. Confidence: **strong** that working memory is limited; **moderate** for specific UI layout effects. Colour choices are justified by **contrast and readability, not by "blue means trust"** claims, which are **weak** and vary by culture.
- **Security impact:** none.
- **Could go wrong / later:** "calm" can drift into "bland". Usability testing with real older users would be the real check.

### D6. Warm, blame-free microcopy for declines and overdue reminders
- **Decision:** e.g. "Friendly reminder: the drill was due back Tuesday. If you need more time, let Sam know."
- **Why:** reminders should get tools back without damaging neighbour relationships.
- **Psychology:** *psychological safety*: people respond better when they don't feel blamed. The core research is about teams at work, so applying it to app copy is **inspiration only**. No fake urgency and no guilt wording, by choice.
- **Security impact:** none.
- **Could go wrong / later:** too soft, and late returns may increase. Could add a second, firmer but still respectful reminder later.

### D7. Phone-first browse feed and one-form listing
- **Decision:** home (public and signed-in) is a vertical feed of large tool cards, newest first, with category chips, 12 per batch, "Show more", and an end message. No photos: cards use category illustrations. No likes or counts. Nav: Browse / My listings / My requests / Incoming (bottom tabs on phone). Listing a tool is one short form.
- **Why:** many people open the app without a goal and notice something useful while scrolling. The feed reuses the same paginated tool query, so it costs almost nothing extra. Photos were dropped to keep the MVP to 1–2 days and to avoid upload, metadata (GPS) and moderation risks.
- **Psychology:** *friction and defaults*: small effort changes behaviour, so cutting steps should help people list tools. Confidence: **moderate**. *Choice overload*: batches of 12 plus a category filter keep choices manageable. Confidence: **mixed**. Meta-analyses disagree: Scheibehenne et al. (2010) found an average effect near zero, and Chernev et al. (2015) found it under specific conditions. Verify both before quoting. Finite feed instead of infinite scroll: an ethics and accessibility choice, not an evidence claim.
- **Security impact:** none. Public feed cards show name + category only.
- **Could go wrong / later:** people who mainly lend may want their dashboard first. The feed may feel thin with few listings, which the seed data covers for the demo.

### D8. "Trusted Lender" badge as the only social signal
- **Decision:** an admin can mark a lender as Trusted. The badge shows on their tools for signed-in users.
- **Why:** required by the spec.
- **Psychology:** *social proof*: people use others' signals to decide. Confidence: **moderate**. An admin-given badge is closer to an authority signal than to peer proof. No fake counts like "5 people are viewing this".
- **Security impact:** only admins can set it. Every change is audited.
- **Could go wrong / later:** a badge could create an in-group/out-group feeling. Peer reviews later would be more honest social proof.

### D9. Production AWS: honest mapping, not claimed experience
- **Decision:** the production note maps each part to AWS services as a design, and says plainly that Anson has not run AWS in production.
- **Why:** the job lists production AWS as required. Overclaiming would fail at interview.
- **Psychology:** none.
- **Security impact:** n/a.
- **Could go wrong / later:** the gap is still a gap. The mapping shows the reasoning, not hands-on experience.

### D10. Tests with Vitest + convex-test
- **Decision:** test the Convex functions directly, with the focus on access denials, validation and idempotency.
- **Why:** security claims need evidence a reviewer can run.
- **Psychology:** none.
- **Security impact:** catches regressions in rule 1 and rule 5.
- **Could go wrong / later:** convex-test runs functions in a simulated environment, not a real deployment, so manual end-to-end checks are still needed.

### D12. Demo data from an internal seed function
- **Decision:** a code list of about 40 tools and 8 demo neighbours (names like "Maya (demo)", `example.test` emails) is loaded with `npx convex run seed:run`. It also creates loans in every state (pending, approved, declined, returned, overdue) and gives about 5 tools to Anson's lender test account. Only 3 real Clerk test accounts: borrower, lender, admin.
- **Why:** a believable feed and a full demo without typing 40 listings by hand.
- **Psychology:** none.
- **Security impact:** the seed is an `internal` function, so it can't be called from the internet (rule 10). No real personal data; `.test` emails can never receive mail.
- **Could go wrong / later:** demo owners have no Clerk login, so they can't approve requests. The demo lender must be a real test account.

### D11. Claude Design brief: tokens only, mock-data props, no free-text request note
- **Decision:** UI_PROMPT.md asks for React + Tailwind TSX with every colour as a CSS variable, typed mock-data props (no data fetching), and an `isAdmin` prop for admin variants. The borrow request has **no free-text note**.
- **Why:** variables make light/dark cheap. Props keep the design separate from the Convex wiring, so the security rules stay in my code, not in generated UI.
- **Psychology:** one primary button per card, for *cognitive load* (**moderate**). No fake urgency or social-pressure counters (an ethics choice, not an evidence claim).
- **Security impact:** dropping the free-text note removes a field that could carry personal info or abusive text, and leaves one less thing to validate. The data rules (public = name + category; email only on approved, not-returned loans) are written into the brief, and will be checked again when the design comes back (Phase 7).
- **Could go wrong / later:** generated code may still hard-code colours or leak fields in mock data. Phase 7 reviews it against DESIGN.md and SECURITY.md before use. A request note could come back later with length limits and a report option.

### D13. UI_PROMPT v2: minimalist direction
- **Decision:** the brief now asks for a flat, minimalist look: no shadows, 1px hairline borders, hierarchy through type size and weight, one accent, hairline rows instead of boxed lists, almost no motion. Fonts change from Inter to Geist (body) + Newsreader (h1/h2). One new decorative token `--tint`. Added `types.ts` + `mock-data.ts` deliverables, exact microcopy for empty/error/dialog/date-error moments, a reference-image "borrow / don't borrow" list, and a self-check list. "List a tool" in the nav is outline so cards keep the only primary button.
- **Why:** user wants a minimal app. Fewer competing elements also fits the calm, mixed-age audience. Specific microcopy and a checklist reduce generated-code drift (hex colours, leaked fields).
- **Psychology:** *cognitive load*: less visual noise leaves more attention for the task. Confidence: **strong** that working memory is limited, **moderate** for specific layout effects. Minimalism is not automatically easier for older users; so text stays 15px+ and chips are not tiny uppercase.
- **Security impact:** none. Data rules unchanged; now also stated for mock data, and "no free-text note" is explicit.
- **Update (v2.1):** brief now states web app = native-feeling phone layout + desktop layout, light and dark both first-class. Category-only icons replaced by ~24 hand-authored per-tool SVG illustrations (flat, token-filled, on a `--tint` tile) so the feed does not look empty without photos; 4 decorative `--art-*` tokens added. Tools need an `artKind` field, derived from the name in code with a category fallback (schema work for Phase 4/5). Illustrations reveal nothing beyond what the name says, so the public-page rule (name + category) still holds. Four reference images added with an explicit do-not-copy list (prices, ratings, hearts, countdowns, orange, 3D, shadows).
- **Could go wrong / later:** hairline-only cards have low edge contrast (`--border` is decorative); an older user might miss card boundaries, so test it. Serif headings add a second font to load.

### D14. Accounts: a fresh Clerk app, minimal JWT, short tokens, no passwords
- **Decision:** a new Clerk app "LendLoop" instead of reusing an old app that already had 19 real users. Sign-in by email code or Google; passwords off; first name required at sign-up. The `convex` JWT template carries only `aud`, `email`, `email_verified`, `given_name` and `role` (Clerk's Convex preset also adds phone, picture, nickname and more), and tokens live 5 minutes instead of the preset's 60. Convex project `lendloop` in the AB team.
- **Why:** a clean user list means nobody from another project can sign in. Fewer claims means less personal data in every request. Short tokens make removing an admin take effect within minutes.
- **Psychology:** *friction*: an email code or Google is less to remember than a password, which matters for mixed-age users. Confidence: **moderate** for "fewer steps helps"; not measured here.
- **Security impact:** no passwords to leak or reuse. Admin can't be faked: only an exact `"admin"` claim signed by Clerk counts (tested with near-misses). Users are created only from the verified token (`users.store` takes no arguments), and an unverified email is never stored.
- **Could go wrong / later:** 5-minute tokens mean more token refreshes (cheap). Email codes depend on email delivery; Google sign-in depends on a Google account.

### D15. Bringing the Claude Design output in: what changes
- **Decision:** the design passed the data-rule check (public = name + category + art; email only on approved/overdue loans; admin only when `isAdmin`; no `dangerouslySetInnerHTML`; no hex outside the token file). Adjustments: Tailwind v4 (`@theme` block) instead of the v3 config; feed paging moves from an in-memory slice to the Convex paginated query; the design's routes (`/`, `/listings`, `/list`, `/requests`, `/incoming`, `/loans/[id]`, `/admin`) replace `/app/*`; `artKind` is worked out in the browser from the tool name so the public response stays exactly `{_id, name, category}`; DESIGN.md corner radius updated to the design's 18/14px. The loan page's "Automation activity" stays: it reads the `automationEvents` table we need anyway, so it is no longer on the cut list. Admin removal asks for a reason (≤ 140 characters), stored in the audit log.
- **Why:** keep the design, but keep the security rules in server code rather than in generated UI.
- **Psychology:** none new.
- **Security impact:** the public response key set stays testable. The removal reason is free text, so it is cleaned and length-capped like any other input.
- **Could go wrong / later:** the admin reason could contain personal details typed by an admin. It is only visible to admins.

### D16. Stack versions and Next.js 16 changes
- **Decision:** Next.js 16.4 (React 19.3, Tailwind 4.3), `@clerk/nextjs` 7, `convex` 1.51, Vitest 5 + convex-test. Route protection lives in `proxy.ts` (Next 16 renamed `middleware.ts`). `npm run typecheck` runs `next typegen` first so route types exist. `@types/node` is `^22` to match the installed Node 22 (Vitest 5 needs it).
- **Why:** current defaults from `create-next-app`; fewer upgrade surprises during review.
- **Psychology:** none.
- **Security impact:** baseline headers (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, no `X-Powered-By`) are on from the start. CSP waits until Clerk and Convex origins are wired, so it can be exact instead of loose.
- **Could go wrong / later:** Clerk 7 removed `SignedIn`/`SignedOut` (now `<Show>`), so the design's shell needs small edits in Phase 7.

### D17. Redesign on shadcn/ui defaults, Sonner for toasts, screens built on mock data
- **Decision (Anson, 20 Nov):** drop the Claude Design look (warm paper, ink blue, Newsreader, hand-drawn tool art, 18/14px corners) and rebuild every screen on **shadcn/ui** (Radix base, "Nova" preset, neutral colours, Geist) with **Sonner** toasts. Build all screens now against an in-memory mock store (`lib/mock/`), then swap in Convex queries after Phase 5.
- **What stayed from the design:** routes, screen list, microcopy (`lib/copy.ts`), date formatting, feed rules (12 per batch, "Show more", end message, no infinite scroll), one primary action per card, confirm only for irreversible actions, data rules, the "Automation activity" list.
- **What changed from shadcn defaults, and why:**
  - Two extra colour tokens: `--attention` (amber, pending/overdue) and `--success` (green, approved/returned), so overdue still never uses red.
  - `--muted-foreground` darkened (0.556 → 0.48 lightness) so small grey text passes 4.5:1 on white; `--input` borders darkened so fields are visible (3:1 for UI borders).
  - Button/input/select/tabs heights raised (default 40px, large 44px, phone tab bar 64px) for mixed-age users and touch.
  - Tool illustrations replaced by one lucide icon per category (decorative, `aria-hidden`).
- **Why shadcn:** Radix primitives give focus trapping, Esc to close, roles and keyboard support in dialogs, menus, selects, tabs and switches, which hand-built components often get wrong. The component code is copied into `components/ui/`, so it stays readable and editable. Sonner gives accessible, non-blocking toasts.
- **Psychology:** unchanged rules (calm feed, no blame copy, amber not red). The new neutral look is plainer than the warm design; no claim that it changes trust. Confidence for the readability choices stays **moderate**.
- **Security impact:** none on the server. The mock store holds full tool rows in browser memory, including on the public page, but only as sample data with `.test` emails; in Phase 7 the public page uses `tools.publicList` (id, name, category only). `users.me` is already real, so the Admin link and console show only for real admins (cosmetic; Convex enforces).
- **New dependencies:** `shadcn` (runtime CSS import), `radix-ui`, `class-variance-authority`, `cn`, `lucide-react`, `sonner`, `next-themes`, `tw-animate-css`, `react-day-picker`, `date-fns`.
- **Could go wrong / later:** screens are wired to mock data, so Phase 7 must replace each `useMockStore()` call with the matching Convex query or mutation and delete `lib/mock/`. The look is closer to a template than the custom design; it can be tuned through the CSS variables in `globals.css` without touching components.

### D18. Visual redesign: restore the original identity on top of shadcn ("paper and ink")
- **Decision (Anson, 20 Nov):** D17's shadcn defaults looked generic. Keep shadcn/Radix for behaviour, but restyle every component and screen around the original v1 palette (paper `#FAF7F2`-family, ink blue `#1F3A68`, amber, sage, terracotta; recovered from the Phase 3 tokens), with Newsreader headings and Instrument Sans for UI, and bring back the 24 hand-drawn tool illustrations from the Claude Design output.
- **Audit findings (what made it generic):** neutral greys replacing the brand colours; one typeface; an identical ring card around every item; stock icons in grey tiles; pills everywhere; every page laid out the same; tabs hiding work. Full list in DESIGN.md.
- **Main changes:** proper light and dark palettes (dark is its own "night ink" palette, not an inversion); added `--sunken`, `--clay`, `--border-strong`, line colours for status fills, and warm layered shadows; a role-based radius scale; ledger rows instead of card-per-item for loans and listings; grouped sections ("Needs your answer / Out on loan / Finished") instead of tabs; fact rows with serif counts; live listing preview beside the form; admin sidebar; loan page with a sticky facts aside and an activity timeline; asymmetric public hero using the real drawings.
- **Research used:** two public anti-"AI look" skill write-ups (unslop-ui, no-ai-design-slop). Applied: replace default tokens, pick a display + body pair, radius by role, no gradients/glows/emoji, no card-around-everything, vary layouts by job, full set of states, motion only for state. Not applied: anything that would add sections, fonts or colours beyond the existing brand.
- **Psychology:** unchanged rules (calm feed, end point, no blame, amber not red). Serif headings and paper tones aim at a "local noticeboard" feel; that is a design intent, **no evidence claim**. Grouping by "needs your answer" reduces search (cognitive load; **moderate** as a general principle).
- **Security impact:** none on data. Art kind is still derived in the browser from the name, so the public payload stays `{id, name, category}`. Admin gate unchanged (cosmetic; Convex enforces).
- **Fixed along the way:** the `cn` helper dropped custom text sizes when combined with a text colour; it is now configured in `lib/utils.ts` and all `components/ui` files import it from there.
- **Could go wrong / later:** 15px body is smaller than v1's 17px (one token to change); the admin console could not be checked visually because the signed-in account is not an admin; the public home page was not checked in the browser because it needs signing out. `components/app/tool-icon.tsx` was unused and has been deleted (Anson OK).

### D19. Phase 5 loan and listing rules
- **Decision:** the rules the Convex functions enforce, beyond SECURITY.md:
  - **Requests:** no borrowing your own tool; one waiting request per tool per borrower; dates that overlap an *approved* loan are refused (the handover day counts as overlap). Overlapping *pending* requests are allowed, and the lender picks one; approving a second overlapping one is refused.
  - **Approve** only from pending, only while the tool is listed, and not once the end date has passed. **Return** only from approved. **Cancel** (borrower) only while pending.
  - **Removing a listing:** a soft delete (`status: "removed"`) so old loans still show what was borrowed. Waiting requests are declined and the borrower is told. The owner can't remove a tool that's lent out or booked; an admin can (abuse), and the approved loan stays so the return can still be recorded.
  - **Contact email** is part of the loan view (lists and loan page), filled in by one helper only for the other party of an approved loan. Admins never get it. This replaces the planned separate `counterpartyContact` query: one place to check instead of two.
  - **Outbox rows** are written in the same transaction as request/approve/decline, so a notification exists only if the change committed. Delivery is Phase 6.
  - **Feed paging:** clients ask for 12; the server refuses more than 50 per page. Personal lists are capped at 100 rows; admin lists are paginated.
- **Why:** each rule closes a way for state to go wrong (double booking, a tool disappearing while someone holds it, a borrower waiting on a deleted listing).
- **Psychology:** declining waiting requests on removal avoids leaving someone hanging (*uncertainty is unpleasant*; **moderate** as a general finding, untested here). No new persuasive patterns.
- **Security impact:** every transition checks side (`requireLoanParty` with `as`) and status, so a forged id or stale tab can't skip a step; tests cover each denial. Views pick fields by hand (`convex/lib/views.ts`) and tests assert no `@` appears in admin, declined or feed responses.
- **Could go wrong / later:** "today" is UTC on the server, so overdue can flip a few hours early or late for UK users in summer. Admin `lenders` scans users (fine at street size; production would store a listing count). Seed `clear` matches seed tools on real accounts by name, so a real tool with the same name *and* a seed loan on it would be removed too (dev only).

### D20. Test accounts use Clerk's `+clerk_test` addresses
- **Decision:** three accounts on the LendLoop dev instance: Priya (borrower), Jonah (lender), Ana (admin). Emails are `borrower|lender|admin+clerk_test@example.com`; in a Clerk development instance these accept the fixed code `424242` and no email is sent. Ana's admin role was set by hand as `publicMetadata.role = "admin"` (D4). No passwords exist.
- **Why:** repeatable demo sign-ins without a real inbox, and no password to store or leak.
- **Psychology:** none.
- **Security impact:** the fixed code works only on development instances, never production. The admin account still goes through the same exact-match role check. `example.com` is reserved, so these addresses can't reach a real person.
- **Could go wrong / later:** anyone who knows the address can sign in to the dev instance, so the dev app must never hold real data. Convex user rows appear only after each account signs in once.
- **Update (Anson, 21 Nov): two sets of accounts.** The `+clerk_test` set stays for reviewers (anyone can sign in with the fixed code). A second set uses Anson's own Gmail addresses: admin = his existing Google account (role added by hand), plus a lender and a borrower account. Reason: real inboxes let the Phase 6 notification emails be seen; while Resend is in sandbox it only delivers to its own account address, so only that inbox will get mail until a domain is verified. Trade-off: real addresses are stored in Convex, shown to the other party of an approved loan, and sent to n8n. All three belong to Anson, so nobody else's data is exposed.
- **Update (seed):** `seed:run` now takes `realLenderEmails` and `realBorrowerEmails` lists (up to 2 each), so both account sets get 5 tools with requests (lenders) or a loan in every state (borrowers), each on separate tools so dates never clash. The cap of 2 keeps the 40 seed tools enough to go round.
- **Update (Anson, 21 Nov): no hand-made data per account.** Asked whether each account should lend and borrow specific real items (planned as Phase 6b). Anson chose to keep the seed data as it is. Why: the seed already gives every account a listing or loan in every state, which is what the demo and the reviewers need; hand-entered items would add nothing to show. Nothing invented, nothing added.

### D21. Phase 6 automation: n8n Cloud, Gmail, secret in an n8n credential
- **Decision (Anson, 21 Nov):** n8n Cloud (`menino.app.n8n.cloud`) instead of Docker, the Gmail node instead of Resend, and the HMAC secret kept in an n8n Crypto credential. Three workflows, built through the n8n MCP and exported to `n8n/workflows/`: Request notification (webhook), Overdue reminders (daily 9:00), Error handler.
- **How it fits together:** every request/approve/decline writes an outbox row in the same transaction; a scheduled action posts it to n8n signed, retries with backoff (1, 5, 15, 60 min) and marks it `failed` after 5 tries. Convex sends `{"payload":"<json string>"}` and signs `t.payload`, so n8n verifies the exact bytes it received (n8n re-parses JSON bodies, which would break a signature over the raw body). n8n remembers each `eventId` in a Data Table and answers `duplicate` to repeats. Reminders ask Convex who is overdue, email each borrower, and write `sent`/`failed` back with a `loanId:day` key. The error workflow posts a signed, email-masked report to Convex (`workflowErrors`), which admins see under Failed automations.
- **Why:** no server to run for the demo; Gmail delivers to any address (Resend's sandbox only reached the account owner); n8n Cloud blocks `$env`, so a credential is the supported place for a secret.
- **Psychology:** emails reuse the D6 tone: plain text, first names only, "saying no is completely fine", blame-free reminders. Confidence: moderate (wording choice, not tested with users).
- **Security impact:** signed both ways, 5-minute window, constant-time compare, fail closed without a secret. n8n keeps no data for successful runs, so recipient addresses don't pile up in execution history. Exports hold credential names/ids only; a scan for the real secret and key patterns came back clean.
- **Checked live (21 Nov):** a real request from Anson's borrower account → outbox `sent` on the first try, event id stored in n8n; wrong-key signature → 401; signed replay of the same event → `duplicate`, no second email. Reminder run: signed request answered with the one eligible loan, Gmail sent, `sent` written back, and the loan is skipped on a re-run the same day. Error path: a signed event with an invalid address made Gmail fail, n8n ran the error workflow, and Convex stored the report (workflow name, execution id, short message, no address) for the admin view.
- **Could go wrong / later:** one personal Gmail account has send limits and no domain authentication; the same secret serves both directions (production: one per direction, rotated); seed data includes `.test`/`example.com` addresses, so reminder runs on dev produce bounces that are recorded as `failed`.

### D22. Phase 7: screens on live Convex data
- **Decision:** every screen now reads and writes through Convex hooks; the mock store and "Sample data" badge are gone (Anson OK to delete `lib/mock/`, 21 Nov). Details:
  - **Types come from the server.** `lib/types.ts` derives each view type from the query's return type (`FunctionReturnType`). If a query's shape changes, the UI stops compiling instead of showing the wrong field.
  - **Errors.** The UI shows the server's own message for INVALID, CONFLICT, NOT_FOUND and RATE_LIMITED (they are written for people and never include anyone else's data), a "sign in again" line for UNAUTHENTICATED, and the calm generic message for anything else. A duplicate or clashing request shows inside the request dialog, next to the dates, not as a toast.
  - **Refused queries.** `QueryBoundary` catches a refused or failed query. "Not yours", "removed" and a malformed id in the URL all read the same: "We couldn't find that loan, or it isn't one of yours", so a stranger can't tell which loans exist.
  - **First sign-in race.** Signed-in pages wait until `users.me` returns the caller's row, so no query runs before `users.store` has created it.
  - **Pagination.** Feeds and admin lists load 12 / 25 at a time with "Show more"; the category filter runs on the server. The Browse header counts ("available today", "neighbours lending") and the admin totals for loans and listings were dropped: with pagination the page only knows what it has loaded, and a count of that would be wrong.
  - **Admin.** Added the Audit log tab (the server query already existed; SECURITY.md rule 9 says admins can view it). Loan rows and failed automations link to the loan page, which an admin sees read-only: both first names, no email, no buttons.
  - **CSP.** Added in `next.config.ts` with the exact Clerk and Convex origins read from env. No nonce: the app uses Partial Prerendering, and the Next.js docs say nonce-based CSP doesn't work with it. So scripts allow `'unsafe-inline'`; the CSP still blocks scripts from, and connections to, any other host.
- **Why:** the backend rules were already tested; this phase makes the screens show the truth and fail politely.
- **Psychology:** errors stay calm and specific ("Someone is borrowing it on those dates. Try other days.") rather than generic, so people know what to do next (D6 tone). Confidence: moderate (tone choice, not user-tested).
- **Security impact:** the UI hides nothing the server would allow; every rule is still enforced in Convex. Checked in the browser with the three reviewer accounts: someone else's loan, a bogus id and the admin page as a non-admin are all refused; the admin's loan view has no email.
- **Could go wrong / later:** `'unsafe-inline'` scripts weaken the CSP against injected inline scripts (React escaping remains the main defence; SRI or dropping PPR would allow a stricter policy). Seeded loans show "Asked on" after "Answered on", because `requestedOn` comes from the row's creation time and the seed creates every row at once (dev data only). The signed-out page has no skip link yet.

### D23. Phase 8: README, production note, final review
- **Decision:** README.md is the reviewer's entry point (what it does, how to run it including n8n, test accounts, env vars, a security summary and a data-minimization table). PRODUCTION.md keeps what changes for production separate, with the AWS mapping clearly labelled as a design (D9). The final security review ticks each SECURITY.md checklist item only with evidence: a script that lists every Convex function and its first line (all 25 public ones start with an access check except `tools.publicList`), a secret scan for the real secret values and key patterns, greps for logging and raw-HTML sinks, the test list, and the browser checks from Phase 7.
- **Why:** a reviewer should be able to check each security claim in minutes, and the AWS gap should be visible, not hidden.
- **Psychology:** none.
- **Security impact:** no code changes beyond a skip link on the signed-out page. The review found nothing to fix.
- **Could go wrong / later:** the folder isn't a git repository yet, so `.gitignore` hasn't been tested in practice; check `.env.local` isn't staged on the first commit. README personal-data rule: it lists only the `+clerk_test` reviewer accounts, never Anson's own addresses.

### D24. How the application handles AI use
- **Decision (Anson, 21 Nov):** the job post asks LLM applicants to include "[llm alert] I am an LLM". Anson is a human applicant who sends the email himself, so that line isn't used. The email instead says plainly that LendLoop was built with an AI coding assistant (Claude Code), that Anson made the scope, security and design decisions, reviewed the output and tested the flows, and that he can explain any part of the code. Anson rewrites the drafted email in his own words before sending.
- **Why:** honesty both ways. Claiming to be an LLM would be false, and hiding AI help would be misleading. Being upfront also matches the project's "say what's true, including the gaps" rule (D9).
- **Psychology:** none.
- **Security impact:** none.
- **Could go wrong / later:** the reader may still weigh AI help negatively. The answer is to know the code well enough to explain any decision in the interview (INTERVIEW_NOTES.md).

### D25. Repo hygiene: what stays off GitHub, and one design file
- **Decision (Anson, 22 Nov):** delete `UI_PROMPT.md`; `DESIGN.md` is the complete design reference (identity, colour, type, layout, components, screens, copy, states, illustrations, accessibility). Where the built app differs from the old brief, `DESIGN.md` section 18 lists it and why. Git-ignored, never pushed: `INTERVIEW_NOTES.md` (interview prep), `PLAN.md` (working task list; it holds Anson's real addresses and application status), `application/` (job-application email and Loom script), `.claude/settings.local.json` (personal permissions). `.env*` was already ignored.
- **Why:** the repo is the reviewer's view. Interview prep and application drafts are for Anson. The README and this log carry what a reviewer needs. Keeping real addresses out of the pushed repo follows the personal-data rule (the README lists only the `+clerk_test` accounts).
- **Psychology:** none.
- **Security impact:** lowers the chance of publishing personal data by accident. Nothing pushed holds a secret: the n8n exports contain credential names and internal IDs only, and the real secret lives in Convex and n8n. Checked with `git add --dry-run -A` in a scratch copy: the ignored files are excluded and the rest is the intended set. This also closes the "not tested" note in D23.
- **Could go wrong / later:** ignored files exist only on this machine, so back them up separately. `DOCUMENTATION.md` and `CLAUDE.md` mention `INTERVIEW_NOTES.md` and `PLAN.md` in plain text (no links), so a reviewer sees a name for a file they cannot open. Deleted on Anson's OK (22 Nov): `AGENTS.md` (a near-copy of `CLAUDE.md`) and the five unused Next starter SVGs in `public/`. `PLAN.md` could be pushed later if its addresses are replaced with placeholders.

### D26. A 40-second product overview video, animated from the real components
- **Decision (Anson, 25 Nov):** add a short video for the reviewer (1920×1080, 40 s, music and captions, no narration; the file is not in this repository). It follows one pressure washer through list, request, approve, n8n email, a security beat and the overdue reminder. It is rendered from the real components and `app/globals.css` with Convex and Next navigation stubbed; no app file was changed to render it (one bug it exposed was then fixed, see below). The email, webhook and flow panels are drawn for the video because the app has no such screens.
- **Why:** nobody asked for a video; 40 seconds is short enough to watch before reading the code. Rendering the real components keeps it honest about what the product looks like.
- **Psychology:** none.
- **Security impact:** people and dates are fictional (`sam@example.test`, `priya@example.test`), and the signature values are dummies. No secret, deployment URL, n8n host or id appears. The caption says "Replays don't email twice" rather than "never a duplicate": n8n stores the event id just after Gmail accepts the message, so a crash between those two steps could still send twice.
- **Could go wrong / later:** call it a product overview, not a recording of the live app. The category is picked in one click (the open menu is not shown). Making it exposed a small bug: after the first date is picked, the request dialog shows "The end date needs to be after the start date" instead of "Now pick the return day." The calendar was setting both ends of the range on the first click. Fixed the same day with `min={1}` on the Calendar (loans are at least 1 day), checked with nine click sequences on the real dialog, and the video was re-rendered from the fixed component.
