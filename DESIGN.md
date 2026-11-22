# LendLoop design

This is the single design reference for the app: identity, principles, colour, type, layout, components, screens, copy, states, responsive rules, accessibility and motion. Read it before any UI work.

It replaces `UI_PROMPT.md` (the Claude Design brief, deleted 22 Nov). Where the built app differs from that brief, this file describes what is built and lists the difference in [Deviations from the original brief](#deviations-from-the-original-brief). The code is the source of truth for values: `app/globals.css` for tokens, `lib/copy.ts` for sentences, `lib/format.ts` for dates, `components/tool-art/` for drawings.

Psychology claims carry the same confidence labels as DOCUMENTATION.md (strong / moderate / mixed / weak). Design choices here are judgement calls unless marked otherwise.

---

## 1. Identity

**LendLoop** is a neighbourhood tool-lending board. Neighbours list tools they own. Others ask to borrow one for a range of days. The owner says yes or no. Automated emails cover requests, answers and overdue reminders.

- **Tagline:** "Borrow what you need. Lend what you don't."
- **Who it is for:** neighbours of mixed ages and confidence with apps. Design for the least confident person on the street.
- **First-load feeling:** calm, easy and useful. Within five seconds, someone sees real tools they could borrow, with nothing to work out.
- **Visual thesis:** a well-kept street noticeboard. Warm paper, ink-blue type and actions, hand-drawn tools, ledger-style lists. Clean, but not colourless.
- **Core idea:** a quiet, scrollable feed, newest first. People open the app with nothing in mind and notice something useful ("a pressure washer, that would help with the patio").

Both light and dark themes are first-class. Every screen is designed and checked in both, on phone (375px) and on desktop (content width 1100px).

---

## 2. Principles

1. **Remove before you add.** If an element doesn't help someone find a tool, ask for one, or answer a request, leave it out.
2. **Paper and ink, not a dashboard.** Surfaces are separated by whitespace and hairlines, with warm low shadows. Nothing is decorated for its own sake.
3. **Typography does the hierarchy.** Serif headings, sans body, size and weight contrast. Boxes and colour are not used to create hierarchy.
4. **One accent.** Ink blue (`--primary`) is the only action colour. One filled primary button per card or screen.
5. **Colour is never the only signal.** Every status has a text label and an icon. Availability has text; the dot is extra.
6. **Amber for attention, never red for lateness.** A late return is not an emergency. Terracotta is for destructive actions and form errors only.
7. **Art is the only picture.** The hand-drawn tool illustrations carry the personality. No hero banners, stock photos, emoji or other ornament.
8. **Warm, plain, blame-free copy.** No fake urgency, counts for their own sake, likes, trending or countdowns.
9. **Share the minimum.** The UI shows only what each screen needs. Email addresses appear in one place only (section 13).
10. **Motion is nearly absent.** Colour and border transitions only. Nothing animates on scroll, and nothing pulses.
11. **A screen should never feel empty.** Good art and generous space beat filler content.

Psychology basis (confidence in brackets, as in DOCUMENTATION.md):
- Cognitive load: one main job and one main button per screen; short text. **Strong** that working memory is limited.
- Psychological safety in copy (decline, overdue, error messages). **Inspiration only**: the research is about teams, not apps.
- Grouping loans by "needs your answer" to reduce search. **Moderate** as a general principle.
- An end point after each batch of 12 in the feed, instead of infinite scroll. Easier for keyboard and older users. Design judgement, not evidence.

---

## 3. Colour

All colours are defined once, in `app/globals.css`, as CSS variables. Tailwind uses them through the `@theme inline` mapping (`bg-card`, `text-muted-foreground`, `border-border`, `bg-tint`, and so on). **No hex values in components.**

Light is the `:root` block. Dark is a separate palette under `.dark` (not an inversion). The app sets the class from `next-themes`; the account menu offers Light, Dark and Match device.

### 3.1 Tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `#F7F3EC` | `#11151C` | page (paper) |
| `--card` | `#FFFDF9` | `#191E27` | raised surface: cards, dialogs, popovers |
| `--sunken` | `#EFE9DE` | `#0D1016` | recessed areas: empty states, calendar well, bands |
| `--foreground` | `#1F2430` | `#ECE8E1` | body text, headings |
| `--muted-foreground` | `#5B6170` | `#A8ADB8` | secondary text, meta lines |
| `--primary` | `#1F3A68` | `#8FB3F0` | primary button, links, selection, focus ring |
| `--primary-hover` | `#19305A` | `#A6C3F4` | primary hover |
| `--primary-foreground` | `#FFFFFF` | `#0F1420` | text on primary |
| `--secondary` | `#F1ECE3` | `#202631` | secondary fills |
| `--muted` | `#EFE9DE` | `#232935` | muted fills |
| `--accent` | `#EBE4D6` | `#262D3A` | hover fill for ghost and secondary controls |
| `--attention` | `#FBEACB` | `#2C2414` | pending and overdue background |
| `--attention-foreground` | `#7A4A06` | `#F2B65A` | text on attention |
| `--attention-line` | `#E9C27A` | `#6B5225` | attention edge |
| `--success` | `#E2EEDF` | `#18281D` | approved, returned, available background |
| `--success-foreground` | `#2F6B3F` | `#7CC48E` | text on success |
| `--success-line` | `#A9CBA9` | `#2F5A3B` | success edge |
| `--clay` | `#9C4A2F` | `#E8987A` | brand accent: the "Loop" in the wordmark, the Trusted Lender mark |
| `--destructive` | `#A23B2A` | `#F08A78` | destructive actions and form errors |
| `--border` | `#E3DCCF` | `#29303C` | hairlines, card outlines (decorative) |
| `--border-strong` | `#CFC6B5` | `#38404E` | card hover edge, outline button edge |
| `--input` | `#8F887B` | `#6A7283` | input edge (non-text UI, 3:1 minimum) |
| `--ring` | `#1F3A68` | `#8FB3F0` | focus ring |
| `--overlay` | `rgb(31 36 48 / 0.32)` | `rgb(5 7 11 / 0.6)` | dialog overlay, ink-tinted, never black |
| `--tint` | `#EDE5D5` | `#232A36` | art tile background (decorative, no text) |
| `--art-blue` | `#C9D6EE` | `#2C3E60` | illustration fill (decorative) |
| `--art-amber` | `#F6D9A0` | `#4A3A1C` | illustration fill (decorative) |
| `--art-sage` | `#CFE0D0` | `#26382B` | illustration fill (decorative) |
| `--art-line` | `#1F2430` | `#D9D4CB` | illustration outline (2px) |

The `--sidebar-*` and `--chart-*` tokens exist because shadcn expects them. No sidebar or chart is built, so they are unused.

### 3.2 Contrast

Measured with the WCAG 2 formula, with the light and dark values above:

| Pair | Light | Dark |
|---|---|---|
| Text on paper | 14.0:1 | 15.0:1 |
| Muted text on paper / on card | 5.6:1 / 7.4:1 | not recorded separately (checked in the browser, Phase 7) |
| Primary on paper / on card | 10.2:1 | 7.9:1 |
| Text on primary | 11.3:1 | 8.7:1 |
| Attention text on attention | 6.3:1 | 8.5:1 |
| Success text on success | 5.3:1 | 7.5:1 |
| Destructive on card | 6.5:1 | 6.9:1 |
| Input edge on card | 3.5:1 | 3.0:1 |

Phase 7 also checked every text and background pair in the browser in both themes: all at least 5.1:1. `--border` and `--tint` are decorative and carry no text.

### 3.3 Usage rules

- **Ink blue (`--primary`)** is the only action colour: the primary button, links, focus, selected filter chip, the active tab indicator.
- **Amber** (`--attention`) is for pending and overdue, and for the incoming count. Never red.
- **Sage** (`--success`) is for approved, returned and available.
- **Clay** appears in exactly two places: the "Loop" in the wordmark and the Trusted Lender mark. Overusing it would dilute it.
- **Terracotta** (`--destructive`) is for destructive actions and form errors. Form errors are also text beside the field, never only a red border.
- **Shadows** are warm and low, tinted with ink. Dark mode uses lighter surfaces instead of shadows.
- **No** gradients, glows, purple, orange as a second brand colour, or translucency except the sticky header and bottom bar (solid when the user reduces transparency).

---

## 4. Typography

| Role | Face | Token | Size / line height | Weight |
|---|---|---|---|---|
| Hero (public home) | Newsreader | `text-display-lg` | 44px / 1.04 | 500 |
| Page title | Newsreader | `text-display-sm` (phone), `text-display` (desktop) | 28px / 1.15, 36px / 1.08 | 500, tracking −0.015em |
| Section title | Newsreader | `text-title` | 22px / 1.2 | 500 |
| Card and row title | Newsreader | 17–20px (inline sizes in components) | ~1.25 | 500 |
| Lede | Instrument Sans | `text-lede` | 18px / 1.55 | 400, muted, max ~58ch |
| Body | Instrument Sans | `text-body` | 15px / 1.6 | 400 |
| Labels, buttons | Instrument Sans | `text-body` / `text-label` | 13–15px | 500 |
| Meta, table headers | Instrument Sans | `text-label` | 13px | 500, muted, sentence case |
| Micro (rare) | Instrument Sans | `text-2xs` | 12px / 1.35 | 500 |

- **Newsreader** (serif, 400–600, with italics) for page titles, section titles, card and row titles, the wordmark and headline numbers. It gives the printed-notice character.
- **Instrument Sans** for UI and body: open shapes, readable at 14–16px, good tabular figures.
- Headline counts use Newsreader (the `FactRow`). Numbers in tables and dates use Instrument Sans with `tabular-nums`.
- Sentence case everywhere. No tracked uppercase labels, no monospace.
- **Dates are always words plus numbers**: "Tue 14 Dec", never "14/12". `formatDate` in `lib/format.ts` produces this. Times read "Sat 21 Nov, 09:06".
- Nothing is set below 13px, apart from the rare 12px micro label (phone tab labels, the account menu caption, the pickup caption). Body is 15px, not 17px (see deviations).
- Keep lines to about 60–70 characters (`max-w-[58ch]` to `max-w-[60ch]` on prose).

Fonts load through `next/font/google` in `app/layout.tsx`, exposed as `--font-instrument` and `--font-newsreader`.

---

## 5. Layout, spacing and radius

### 5.1 Spacing

Tailwind's 4px scale. Common values: 8, 12, 16, 24, 32, 48, 64.

- Page top padding: 32px on phone, 48px on desktop.
- Sections are 40px apart. Macro spacing on the public page is larger (48–64px between bands).
- Rows: 16–20px vertical padding. Cards: 20–24px padding.
- Content width: `max-w-6xl` (72rem) in the signed-in shell and public page. Text blocks are narrower (about 60ch).
- Page gutter: 16px on phone (`px-4`), 24px from `sm` (`sm:px-6`).

### 5.2 Shell

- **Header:** 64px tall (`h-16`), sticky, translucent paper with blur, solid under reduced transparency. Hairline underneath.
- **Desktop nav** (`md` and up): links in the header. The current page has an ink underline (`after:` rail) and `aria-current="page"`. Incoming shows an amber count of waiting requests. Admin appears only for admins.
- **Phone nav** (below `md`): a fixed bottom tab bar with four tabs: Browse, Listings, Requests, Incoming. Each tab is at least 64px tall. The active tab has a short ink bar at its top edge. The bar respects the home-indicator safe area (`env(safe-area-inset-bottom)`). Main content has 112px of bottom padding so nothing hides behind it.
- **Account menu:** the first-name initial in a circle, then the name (desktop). The menu holds "Signed in as", Appearance (Light, Dark, Match device), Admin (phone only, since the tab bar lacks it), and Sign out.
- **"List a tool"** sits in the header, next to the account menu. It is a filled primary button in the build (see deviations).
- **Skip link:** "Skip to content" is the first focusable element on every page, signed in or out.

### 5.3 Grids and breakpoints

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px.

| Surface | Phone (375px) | Tablet (768px) | Desktop (1100px) |
|---|---|---|---|
| Public feed | 2 columns | 3 columns | 4 columns |
| Signed-in feed (Browse) | 1 column, drawing on top | 1 column, drawing on the left from `sm` | 2 columns from `lg` |
| Loan ledger | single column rows | single column rows | single column rows, wide |
| Loan detail | single column | single column | content plus a sticky facts column |
| Admin | tab rail, stacked rows | tab rail | sidebar tabs, tables |

No horizontal page scroll at any width. The only exception is the category chip row, which scrolls sideways with a faded edge.

### 5.4 Radius

Radius is set by role, not uniform:

| Role | Radius |
|---|---|
| Tags, small badges | 4px (`rounded-sm`) |
| Small buttons (`sm`), menu items | 6px (`rounded-md`) |
| Buttons (default, lg), inputs, art tiles inside cards | 8px (`rounded-lg`) |
| Cards, ledger lists, empty states | 12px (`rounded-xl`) |
| Dialogs | 16px (`rounded-2xl`) |
| Status badges, category filter chips | pill (`rounded-full`) |

Pills are only for status badges and filter chips. Primary buttons are not pills.

### 5.5 Elevation

| Token | Use |
|---|---|
| `shadow-xs` | resting outline controls |
| `shadow-card` | cards |
| `shadow-raised` | dialogs, menus, popovers, skip link focus |
| `shadow-button` | filled buttons (soft inner highlight) |

One treatment per surface: a hairline border, or a shadow, never both on the same edge.

---

## 6. Iconography

- **Library:** `lucide-react`, one stroke family. Default stroke 1.8; the active phone tab uses 2.2. Round caps and joins come with the library.
- **Sizes:** 16px inside buttons and badges (`size-4`), 20–22px in the phone tab bar.
- **Decorative icons** are `aria-hidden`. An icon that carries meaning has text next to it, or an accessible label.
- Status icons: Pending (hourglass), Approved (check circle), Overdue (clock), Returned (undo), Declined (x circle), Cancelled (ban). Trusted Lender uses a badge-check icon.
- Admin tabs: scroll text, package, badge-check, alert circle, history.

---

## 7. Tool illustrations (ToolArt)

The drawings are the app's only pictures. They were hand-drawn for the Claude Design output (Phase 3, D15) and restored in D18.

### 7.1 Style rules

- Inline SVG React components in `components/tool-art/`. Flat fills only: no gradients, shadows or 3D.
- 2px `--art-line` outline, one stroke weight across all drawings.
- 2–3 flat fills from `--art-blue`, `--art-amber`, `--art-sage` and `--tint`, plus small detail strokes. Fills use tokens, so the drawings switch correctly between light and dark.
- Chunky, rounded, friendly shapes. Centred with breathing room.
- `aria-hidden="true"`. The tool name and category are real text next to the drawing.
- **No text on the drawing or its tile.**
- The drawing is never the only way a tool is identified. The name is always shown.

### 7.2 Tiles and frames

`<ToolArt name category frame="tile" | "none" />`:
- `frame="tile"` (default): a rounded `--tint` tile (`rounded-lg bg-tint p-3`) with the drawing centred, aspect 4:3.
- `frame="none"`: no tile, for places that already provide a surface (the tool card's tinted left panel, empty states).

Used on: public cards, the signed-in tool card, loan rows (thumbnail), the request dialog header, the public home shelf, empty states.

### 7.3 The 24 drawings

| File | Kinds |
|---|---|
| `PowerTools.tsx` | `drill`, `circular-saw`, `sander`, `jigsaw` |
| `HandTools.tsx` | `toolbox`, `hammer`, `spirit-level`, `step-ladder` |
| `Garden.tsx` | `lawnmower`, `hedge-trimmer`, `wheelbarrow`, `garden-hose` |
| `Kitchen.tsx` | `stand-mixer`, `blender`, `slow-cooker`, `dehydrator` |
| `Camping.tsx` | `tent`, `camping-stove`, `cool-box`, `sleeping-bag` |
| `CleaningOther.tsx` | `pressure-washer`, `vacuum`, `carpet-cleaner`, `generic` |

`parts.tsx` holds shared shapes. `index.tsx` holds the mapping.

### 7.4 Choosing a drawing

The browser derives the kind from the tool **name** (decision D15), so the public payload stays `{ id, name, category }`.

1. **Keyword rules**, first match wins (`KEYWORDS` in `index.tsx`):
   circular / mitre / table saw → `circular-saw`; jigsaw → `jigsaw`; sander / sanding → `sander`; drill / driver / heat gun → `drill`; hammer / mallet → `hammer`; level → `spirit-level`; ladder / step → `step-ladder`; toolbox / socket / spanner / wrench / screwdriver → `toolbox`; mower → `lawnmower`; hedge / trimmer / strimmer / blower → `hedge-trimmer`; barrow → `wheelbarrow`; hose / sprinkler / reel → `garden-hose`; mixer → `stand-mixer`; blender → `blender`; slow cooker / cooker / pot → `slow-cooker`; dehydrator → `dehydrator`; tent / gazebo → `tent`; stove → `camping-stove`; cool box / cooler → `cool-box`; sleeping → `sleeping-bag`; pressure / jet wash → `pressure-washer`; carpet / steam → `carpet-cleaner`; vacuum / hoover → `vacuum`.
2. **Category fallback** if no keyword matches:

| Category | Fallback drawing |
|---|---|
| Power tools | drill |
| Hand tools | toolbox |
| Garden | wheelbarrow |
| Kitchen | blender |
| Camping | tent |
| Cleaning | vacuum |
| Other | generic |

Changing a keyword or fallback changes what a listed tool looks like, so do it deliberately.

### 7.5 Gallery

The brief asked for a ToolArt gallery and a states gallery (every drawing and every state in light and dark). **Neither is built.** Add them if a design review needs them in one place.

---

## 8. Components

### 8.1 Base components (`components/ui/`)

shadcn/ui on Radix, restyled to this file. Each file is owned code in the repo. Add new ones with `npx shadcn@4.23.0 add <name>`, then restyle.

Present: alert-dialog, avatar, badge, button, calendar, card, dialog, dropdown-menu, input, label, popover, select, separator, sheet, skeleton, sonner, switch, table, tabs, textarea, tooltip. Radix provides focus trapping, Esc to close, keyboard handling and ARIA roles.

**Button** (`components/ui/button.tsx`). Hover changes colour only. Press nudges down 1px. Focus is a 3px ring in `--ring` at 35% with 1px offset.

| Variant | Look | Use |
|---|---|---|
| `default` | solid ink, soft inner highlight | the one primary action per card or screen |
| `outline` | paper, visible edge (`--border-strong`) | secondary actions: Cancel request, Decline, Edit, Show more, Try again |
| `secondary` | sunken fill | quiet alternatives |
| `ghost` | no edge, accent on hover | tertiary actions, nav links, Details, Not now |
| `destructive` | terracotta outline | destructive actions outside a dialog (use sparingly) |
| `destructiveSolid` | filled terracotta | confirm button inside a destructive dialog only |
| `link` | underlined text | inline links |

| Size | Height | Use |
|---|---|---|
| `default` | 40px | most buttons |
| `lg` | 44px | public home, Show more, hero actions |
| `sm` | 36px | row actions, header "List a tool" (the build uses 36px in the header) |
| `icon`, `icon-sm`, `icon-lg`, `icon-xs` | square | icon-only |

**Badge** variants: `attention` (pending, overdue, incoming count), `success` (approved), `secondary` (declined, cancelled), `outline` (returned), `tag` (category and condition tags on the tool card).

**Inputs, select, textarea:** card fill, `--input` edge, ink border and soft ink ring on focus, 40px tall. The edge is always visible; it is never the only edge that exists for an input (the label and helper text are there too).

**Dialog:** centred, `rounded-2xl`, 24px padding, `--card` surface, `shadow-raised`, width `calc(100% - 2rem)` on phone and `sm:max-w-sm` or `sm:max-w-md` on desktop. Serif title, footer on secondary paper. Overlay is ink-tinted. The close button is an icon button in the top-right corner.

**Toasts (Sonner):** paper card with raised shadow, icon coloured by meaning. Toasts never replace the inline state (the screen shows the change too). Messages are short; no pile-up (one at a time, dismissing on its own).

### 8.2 LendLoop blocks (`components/app/`)

| Block | File | What it is |
|---|---|---|
| Shell | `app-shell.tsx` | header, desktop nav, phone tab bar, account menu, skip link |
| Wordmark | `page-header.tsx` | "Lend" + clay italic "Loop", Newsreader |
| PageHeader | `page-header.tsx` | serif title, optional lede, meta line, right-side action |
| SectionHeading | `page-header.tsx` | smaller serif title with muted count and hint |
| EmptyState | `page-header.tsx` | drawing, one sentence, one action, on sunken paper |
| FactRow | `page-header.tsx` | serif numbers with small sans labels; optional attention or success tone |
| ToolCard, PublicToolCard, Availability, TrustedMark | `tool-card.tsx` | the two tool cards and their parts |
| PublicFeed, SignedInFeed, FeedFrame | `tool-feed.tsx` | feed grids, batches of 12, Show more, end message, loading and empty states |
| CategoryFilter | `category-filter.tsx` | the chip row |
| LoanRow, LoanActions | `request-card.tsx` | ledger row for a loan and its one action |
| StatusBadge | `status-badge.tsx` | the six loan statuses |
| PickupContact | `pickup-contact.tsx` | the "Arrange pickup" box |
| RequestDialog | `request-dialog.tsx` | borrow request: date range and summary |
| ConfirmAction | `confirm-action.tsx` | confirm step for irreversible actions |
| QueryBoundary | `query-boundary.tsx` | turns refused queries into a calm message |
| ToolForm | `tool-form.tsx` | list or edit a tool, with live preview |

### 8.3 Button rule

Each card and each screen has **one** primary (`default`) action. Everything else is `outline` or `ghost`. "List a tool" should never compete with a card's action; in the build it is still filled in the header (deviation below).

---

## 9. Patterns

### 9.1 Ledger rows (lists)

Lists of loans and listings are rows in one surface, separated by 1px dividers, not a stack of cards. Each row: thumbnail drawing, serif title (links to the loan), a meta line, the status badge, one sentence of plain-language note, the pickup box when open, and one primary action plus a "Details" ghost link.

Finished loans are compact rows with no note and no actions.

### 9.2 Grouped loans, not tabs

Requests and Incoming are grouped under headings rather than hidden behind tabs, so nothing that needs an answer is hidden.

| Screen | Group titles |
|---|---|
| Incoming (lender) | "Needs your answer", "Out on loan", "Finished" |
| My requests (borrower) | "Waiting for an answer", "Borrowing now", "Finished" |

"Finished" is quiet (compact rows, muted).

### 9.3 Fact row

Headline numbers in serif with a small sans label, e.g. "2 waiting for you · 1 out on loan". Attention tone for things that need action, success tone for things back in place. This gives the important count prominence without a dashboard.

### 9.4 Tool card (signed in)

From top to bottom, on phone. From `sm` the drawing is a tinted panel on the left and the details sit on the right.

1. Drawing (large, ~4:3, on the tint).
2. Two tags: category and condition (small, square-ish, outlined).
3. Tool name, serif, `1.25rem`.
4. Two-line description (clamped). The brief put descriptions in the request screen only; the build shows them on the card.
5. "Lent by **First name**" with the Trusted Lender mark (clay, badge-check icon) if set. For your own tools: "Your tool".
6. Footer, with a hairline above it: availability on the left ("Available" with a sage dot, or "On loan until Tue 14 Dec" with a muted dot), and the action on the right: **"Ask to borrow"**. The button is `default` when available and `outline` when the tool is on loan. Own tools show no button.

### 9.5 Public card (signed out)

Drawing on a tint tile, the name in serif, and the category in muted sans. Nothing else: no owner, condition, description, availability or action.

### 9.6 Status badges

Pill, tinted fill, matching edge, icon, text label.

| Status | Label | Variant | Icon |
|---|---|---|---|
| pending | Pending | attention | hourglass |
| approved | Approved | success | check circle |
| overdue | Overdue | attention | clock |
| returned | Returned | outline | undo |
| declined | Declined | secondary | x circle |
| cancelled | Cancelled | secondary | ban |

Overdue is amber, never red.

### 9.7 Pickup contact box

Shown only on a loan that is **approved or overdue (not yet returned)**, and only to its two parties. Labelled "Arrange pickup with **First name**", then the other person's email. Nothing else in the app shows an email (section 13).

### 9.8 Loan detail

Title and both first names, dates, the status, the note for this viewer, the actions (same rules as the rows), a timeline of the loan's steps, the pickup box (when open), and an **"Automation activity"** list in plain words, for example "Request email sent · 2 days ago", "Reminder sent · today", "Reminder failed · retrying". Admins see both names and no actions, notes or emails.

### 9.9 Dialogs

- **Confirm** (`ConfirmAction`, an alert dialog). Used for anything irreversible: Decline, Delete, admin Remove. Focus starts on the cancel button. The confirm button is `destructiveSolid`. Cancel reads "Keep it" by default.
- **Borrow request** (`RequestDialog`). Title "Borrow the drill", subtitle "from Sam", one line explaining that the lender gets an email. Calendar range picker (weeks start Monday; days before today are disabled). A summary line under the calendar: "Mon 14 Dec to Wed 16 Dec · 3 days", or a plain-words error in its place. Footer: "Not now" (ghost) and "Send request" (default, disabled until the range is valid or while sending). There is **no note field**.

### 9.10 Forms (List a tool, Edit)

- Labels above fields. Helper text under the label. Inline errors in plain words, linked with `aria-describedby`, announced with `aria-live="polite"`. The first invalid field gets focus.
- Name (max 60 characters), category select, condition, description (max 280, live counter).
- A live preview of the listing sits beside the form on desktop.
- Submit: **"List it"** on the new form, **"Save changes"** on edit. (The brief said "List tool".)

### 9.11 Empty, loading and error

- **Empty:** `EmptyState` on sunken paper: drawing, one sentence, one action. No dashed boxes.
- **Loading:** skeletons shaped like the content (ledger rows, tool cards, the feed grid) on the tint or muted colour. No blocking spinners. Buttons show "Sending…", "Loading…" or "Working…" while busy.
- **Error:** `QueryBoundary` catches refused queries. A refused or missing item shows "We couldn't find that loan, or it isn't one of yours" with a link back. Any other failure shows "We couldn't load this just now. Check your connection and try again." with **Try again** (outline). A lapsed sign-in shows its own sentence. The raw error never reaches the screen.
- **Success:** a toast plus the change visible on the screen. Never a toast alone.

---

## 10. Screens

Each route, its file, and what it must show. Routes are in `app/`; screens are in `components/screens/` (or `components/app/` for dialogs and blocks).

### 10.1 Home `/`

- **Signed out:** `PublicHome` (`screens/public-home.tsx`).
  - Header: wordmark and a "Sign in" ghost button.
  - Hero: eyebrow "A lending board for your street" (clay), serif headline "Borrow what you need. *Lend what you don't.*" (second half italic, muted), lede, primary "Join your neighbours" (lg) and outline "I already have an account" (lg). Below a hairline, the privacy note with a lock icon: "We only show what a tool is. Who owns it stays private until you both agree to a loan."
  - Desktop only: a small shelf of five drawings on the right, decorative (hidden on phone).
  - Band "Shared nearby" on sunken paper: the public feed, with the line "Sign in to see who's lending and when it's free."
  - Footer: wordmark and "Built as a take-home project. Demo data only."
  - Phone: the public feed in two columns.
- **Signed in:** `Browse` (`screens/browse.tsx`) inside the app shell. Category chips, then the signed-in feed. See 10.2.

### 10.2 Browse (signed in)

- Sticky row of category chips: All, Power tools, Hand tools, Garden, Kitchen, Camping, Cleaning, Other. Selected = filled ink. Unselected = outline. On phone the row scrolls sideways with a faded edge.
- Feed: newest first, 12 per batch, then a **"Show more"** button (outline, lg). No infinite scroll. Once exhausted, the end message: "That's everything nearby for now. Check back later, or list something of your own."
- Empty filter: "Nothing in Garden right now." The chip row is the way back to All. (The brief's "Show all tools" button is not built.)
- Loading: four wide skeleton cards for signed-in users (the public feed shows eight square ones).
- Show more keeps the scroll position and appends below. It does not move focus in the build; the brief asked to move focus to the first new card, which is still to do.
- Shows: drawing, name, category, condition, lender first name, trusted mark, availability, "Ask to borrow". Never emails, never loan contact details.

### 10.3 List a tool `/list`

`ToolForm` in new mode. Name, category, condition (Like new / Good / Worn but works), description (280 max, live counter), live preview on desktop, primary **"List it"**. Success toast: "Your drill is listed."

### 10.4 Edit a listing `/listings/[id]/edit`

Same form in edit mode. Primary **"Save changes"**. Success: "Saved changes to your drill."

### 10.5 My listings `/listings`

- Header with a fact row: tools listed, on loan, waiting requests.
- Ledger rows: drawing, name, status (Available with sage dot, or "On loan until …"; "Pending requests: n" when waiting), **Edit** (outline, small) and **Delete** (ghost, destructive on hover, opens confirm).
- Delete confirm: "Delete your drill?" / "It disappears from the board straight away. Past loans stay in your history. This can't be undone." / **Delete listing** (destructive) and **Keep it**. Success: "Your drill is no longer listed."
- Empty: "You haven't listed anything yet." (the brief's "List a tool" button is not on this empty state; the header has it).
- Owner cannot delete a tool that is out or booked (server rule, D19). The server's reason is shown, e.g. "This tool is lent out or booked. Mark it returned before removing it."

### 10.6 My requests `/requests`

Borrower view, grouped (9.2). Each row: tool, lender's first name, dates, status, the note ("Waiting for Sam to answer.", "Good news: Sam has said yes…", and so on), the pickup box when approved, and **Cancel request** (outline) while pending. There is no primary button on a pending row.
- Empty: "You haven't asked to borrow anything yet." with **Browse tools**.

### 10.7 Incoming `/incoming`

Lender view, grouped (9.2).
- Pending: **Approve** (default) and **Decline** (outline, opens the decline confirm: "Say no to Sam?", explaining that Sam will be told, with **Decline request**).
- Approved or overdue: **Mark returned** (default).
- The nav count is the number pending.
- Empty: "No requests waiting. We'll email you when someone asks."

### 10.8 Loan `/loans/[id]`

See 9.8. The aside holds the facts: tool, both first names, dates, length, returned date (if any), status. Admins see the same page with names only, no actions, no note and no emails.

### 10.9 Admin `/admin` (admins only)

Clearly labelled admin area: the page title is "Admin", with the line "Keep the board healthy. Every change here is written to the audit log with your name."

Tabs (sidebar on desktop, scrolling rail on phone):

| Tab | Hint shown | Actions |
|---|---|---|
| All loans | "Across the whole street, newest first. Open one to see its emails and reminders." | open a loan |
| Listings | "Remove anything unsafe or not a tool. A reason is required." | Remove listing (confirm: "Remove listing" / "Keep it", reason field required) |
| Trusted Lenders | "The badge shows on a lender's tools. Give it to people who have lent reliably." | toggle the badge per lender |
| Failed automations | "Retries run automatically. These are the ones that still need a look." | open the loan (time, type, loan link, short sanitised error) |
| Audit log | "Approvals, declines, returns, removals and badge changes, newest first. First names only." | read only |

Non-admins who open the page see a refusal, never the console. Admin screens show first names only, never emails.

### 10.10 Request limit and errors inside dialogs

A rate-limited request shows, inside the request dialog: "You've got 10 requests waiting already. Once some are answered, you can send more." The button is disabled. Date clashes and invalid dates show as text next to the calendar.

---

## 11. Copy and tone

All user-facing sentences live in `lib/copy.ts`; `lib/format.ts` makes dates; `lib/errors.ts` shows server messages for known codes (`INVALID`, `CONFLICT`, `NOT_FOUND`, `RATE_LIMITED`) and generic copy otherwise.

Tone: warm, plain, no blame, first names, no exclamation-mark pressure, no fake urgency, no guilt.

### 11.1 Key sentences (as in `lib/copy.ts`)

| Moment | Copy |
|---|---|
| Tagline | Borrow what you need. Lend what you don't. |
| Privacy note | We only show what a tool is. Who owns it stays private until you both agree to a loan. |
| End of feed | That's everything nearby for now. Check back later, or list something of your own. |
| Rate limit | You've got 10 requests waiting already. Once some are answered, you can send more. |
| Save error | That didn't save. Check your connection and try again. Nothing was lost. |
| Load error | We couldn't load this just now. Check your connection and try again. |
| Session lapsed | Your sign-in has run out. Sign in again and try once more. |
| Not found | We couldn't find that loan, or it isn't one of yours. |
| Listing not found | We couldn't find that listing. It may have been deleted. |
| Name required | Give your tool a name, like 'Cordless drill'. |
| Name too long | Names can be up to 60 characters. Try a shorter one. |
| Description too long | Descriptions can be up to 280 characters. Try a shorter one. |
| Category required | Pick the category that fits best. |
| Reason required (admin) | Add a short reason. It goes in the audit log. |
| Start date past | Pick a start date from today onwards. |
| End before start | The end date needs to be after the start date. |
| Over 30 days | Loans can be up to 30 days. Try a shorter range. |
| Request sent | Request sent to Sam. |
| Tool listed | Your drill is listed. |
| Tool saved | Saved changes to your drill. |
| Tool deleted | Your drill is no longer listed. |
| Approved (lender) | You said yes to Priya. Their email is now on the loan page. |
| Declined (lender) | We'll let Priya know, kindly. |
| Returned | Marked your drill as back home. |
| Cancelled | Request cancelled. |
| Empty: listings | You haven't listed anything yet. |
| Empty: requests | You haven't asked to borrow anything yet. |
| Empty: incoming | No requests waiting. We'll email you when someone asks. |
| Empty: filter | Nothing in Garden right now. |

Borrower notes (`loanNote`): declined → "Sam can't lend this for those dates. You could try other dates or a similar tool."; approved → "Good news: Sam has said yes. You can now see their email to arrange pickup."; overdue → "Friendly reminder: the drill was due back Tuesday. If you need more time, let Sam know."; returned → "Returned Mon 9 Dec. Thanks for taking care of it."; cancelled → "You cancelled this request."; waiting → "Waiting for Sam to answer.".

Lender notes: declined → "You said no to this request."; approved → "You said yes to Priya. Their email is below to arrange pickup."; overdue → "Priya has had your drill past Tuesday. A quick message may help."; cancelled → "Priya cancelled this request.".

### 11.2 Dialog copy

| Dialog | Title | Body | Buttons |
|---|---|---|---|
| Decline (lender) | Say no to Priya? | We'll tell Priya you can't lend the drill for those dates, and suggest other dates or a similar tool. This can't be undone. | **Decline request** / Keep it |
| Delete listing | Delete your drill? | It will disappear from the feed. This can't be undone. | **Delete listing** / Keep it |
| Remove (admin) | Remove this listing? + reason field | the reason goes in the audit log | **Remove listing** / Keep it |
| Borrow | Borrow the drill | Pick the day you'd collect it, then the day you'd bring it back. Sam gets an email and can say yes or no. | **Send request** / Not now |

Dialog buttons name the action. Never "OK" or "Cancel".

### 11.3 Audit and automation labels

Admin audit actions: "Approved a request", "Declined a request", "Marked a tool returned", "Deleted their listing", "Removed a listing", "Gave the Trusted Lender badge", "Removed the Trusted Lender badge".

Activity lines: "Request email on its way / sent / failed", "Answer email …", "Reminder sent", "Reminder failed". Failed-automation types: "Request email", "Approval email", "Decline email", "Overdue reminder", "Workflow run".

---

## 12. States

Every relevant screen has these states. The StatesGallery from the brief is not built; check each state on the screen itself.

| State | Where | What it shows |
|---|---|---|
| Empty | feed, listings, requests, incoming, filter | sunken EmptyState, drawing, sentence, one action |
| Loading | feed, lists, loan, admin | skeletons shaped like the content, no spinner |
| Error | any screen | `QueryBoundary` message and Try again |
| Not found | loan, listing | calm sentence and a link back |
| Success | forms, actions | toast plus the visible change |
| Busy | buttons | "Sending…", "Loading…", "Working…" (buttons disabled) |
| Pending | badges | Pending (amber, hourglass) |
| Approved | badges | Approved (sage, check) |
| Overdue | badges | Overdue (amber, clock), reminder copy in the note |
| Returned | badges | Returned (outline, undo) |
| Declined | badges | Declined (muted, x) |
| Cancelled | badges | Cancelled (muted, ban) |

---

## 13. Data visibility (what each screen may show)

This is the UI side of the rules in SECURITY.md. **The server enforces these**; the UI only hides what it must not show.

1. **Signed-out pages** show tool name and category, plus the drawing. Nothing else: no owner, condition, description, location, photo or availability. (`tools.publicList` returns only these fields.)
2. **Email addresses** appear only in the pickup box, for a loan that is approved or overdue and not yet returned, and only to its two parties. Nowhere else: not on cards, rows, the admin console, the audit log or failure reports.
3. **Everywhere else**, people appear by first name only.
4. **Admin-only controls** (Remove listing, Trusted Lender toggle, all-loans view, failed automations, audit log) render only for admins, in the admin area. Hiding them is cosmetic; the server refuses non-admins.
5. **The borrow request has no free-text note.** Only dates.
6. **Refused and missing items look the same.** "We couldn't find that loan, or it isn't one of yours." Nobody can tell which loans exist.

Public privacy line, used as written: "We only show what a tool is. Who owns it stays private until you both agree to a loan."

---

## 14. Responsive

- **Phone (375px), native-app feel:** single column; drawing above the text on cards; full-width primary actions where they stand alone; bottom tab bar with safe-area inset; admin uses a scrolling tab rail (stacked rows instead of tables is the intent; check the admin tables on a phone before relying on it).
- **Tablet (768px):** two-column public feed (three at `sm`); the signed-in tool card switches to drawing-left.
- **Desktop (1100px content):** top nav; public feed in four columns; signed-in feed in two columns from `lg`; loan detail with a sticky facts column.
- **Both themes at every size.** Check each screen in light and dark.
- No horizontal page scroll. The category chip row is the only scroller.
- Touch targets: primary actions 40–44px, phone tab bar 64px. Known gap: `sm` buttons are 36px tall (see deviations).

---

## 15. Accessibility

- **Contrast:** WCAG 2.2 AA for text (table in section 3.2). Decorative tokens (`--tint`, `--art-*`, `--border`) carry no text.
- **Keyboard:** everything works by keyboard. Logical tab order. Visible focus on every control: a 3px ring in ink at 35%, with offset.
- **Skip link** "Skip to content" on every page.
- **Current page:** `aria-current="page"` on the active nav item and tab.
- **Landmarks:** `main`, `nav aria-label="Main"`, `section aria-label` for feeds, `aria-busy` on loading regions.
- **Forms:** real `<label>` elements. Helper and error text linked with `aria-describedby`. Errors announced with `aria-live="polite"`. First invalid field focused.
- **Dialogs** (Radix): focus trapped, Esc closes, focus returns to the trigger. Confirm dialogs start focus on the safe button.
- **Icons:** decorative icons `aria-hidden`; status text is always present, so icon and colour are never the only signal.
- **Drawings:** `aria-hidden`; the name is always shown.
- **Live counts:** the feed's "Show more" region is `aria-live="polite"`; the incoming count reads as "n pending".
- **Reduced motion:** `prefers-reduced-motion` shortens all animations and transitions to effectively none (in `globals.css`).
- **Reduced transparency:** `prefers-reduced-transparency` makes the sticky bars solid.
- **Theme:** follows the device by default. Manual choice in the account menu (Light, Dark, Match device), stored by `next-themes` (the class `dark` on `<html>`).
- **Dates** always shown as words plus numbers.

---

## 16. Motion

- 150–200ms colour, border and shadow transitions on controls and cards (`transition-colors`, `duration-150`).
- Dialogs and menus fade and scale from 95% to 100% over about 100ms.
- No entrance animations, no scroll-triggered effects, no staggering, no hover lift, no pulsing, no confetti.
- `prefers-reduced-motion` removes the rest.

---

## 17. Where things live, and how to change them

| What | Where |
|---|---|
| Colours, shadows, radius, type scale | `app/globals.css` (the only place colours are defined) |
| Fonts | `app/layout.tsx` (`next/font/google`) |
| Base components | `components/ui/` (shadcn, restyled, owned code) |
| LendLoop blocks | `components/app/` |
| Screens | `components/screens/` (routes in `app/` stay thin) |
| Tool drawings and mapping | `components/tool-art/` |
| Sentences | `lib/copy.ts` |
| Dates | `lib/format.ts` |
| Server message handling | `lib/errors.ts` |
| Types (derived from Convex) | `lib/types.ts` |
| Class merging | `cn` from `@/lib/utils` (configured for the custom text sizes; never import from `"cn"` directly) |

**Rules when changing the design:**
1. Change a colour or size in one place only, `globals.css`. Add a named size or colour there, and register it in `lib/utils.ts` if it is a text size, so `cn` keeps it.
2. Do not add a token without saying so in DOCUMENTATION.md. The brief limited tokens; the build added a few (`--sunken`, `--clay`, `--border-strong`, the line colours, the shadows) for the same reason.
3. Update this file when a visual rule changes, and add a DOCUMENTATION.md entry for the decision.
4. Check each change in light and dark, on phone and desktop, with keyboard.

---

## 18. Deviations from the original brief

The brief (`UI_PROMPT.md`, deleted 22 Nov) asked for a minimalist v2 design. The build (DESIGN v3 "paper and ink", D18) keeps its intent and changes the following on purpose. Each is listed so a reviewer knows it was a choice.

| Area | Brief | Built | Why |
|---|---|---|---|
| Component base | plain React and Tailwind, no UI library | shadcn/ui on Radix | focus, Esc and ARIA handled by a tested base (D17) |
| Body font | Geist | Instrument Sans | more open shapes at 14–16px (D18) |
| Headings | Newsreader 500, 28/36px | Newsreader 500, 28/36px | as brief |
| Body size | 17px | 15px (`text-body`) | denser ledger lists; one token to raise it |
| Radius | 12px cards, 10px buttons | 12px cards, 8px buttons, 16px dialogs, pills for badges and chips | radius by role (D18) |
| Shadows | none | warm, low shadows (`shadow-card`, `shadow-raised`) | "paper" surfaces need slight lift; dark mode uses lighter surfaces |
| Lists | rows for lists, cards for feed and requests | ledger rows for loans and listings; cards for the feed | as brief, plus loan list grouping |
| Icons | inline SVG, no library | `lucide-react` | consistent, accessible icons with less code |
| Card content | no description on the card | two-line description on the signed-in card | one more line of context for borrowers |
| Card action | "Request to borrow" | "Ask to borrow" | softer wording, same action |
| "List a tool" | outline | filled primary in the header | the build's header button is filled; it competes with card actions, so **open: change to outline** |
| Request dialog | full-screen sheet on phone; Start / End / Length block; primary pinned to the bottom | centred dialog on all sizes; calendar range; one summary line; primary below the calendar | simpler; **open: full-screen sheet on phone** if tests show it is needed |
| Decline wording | "Decline Sam's request?" / "Decline request" / "Keep request" | "Say no to Sam?" / "Decline request" / "Keep it" | warmer title; cancel label is the shared default |
| Small text | nothing under 15px | 12px micro labels (tab bar, account caption, pickup caption) | fit in the tab bar; **open** |
| Touch targets | 44px minimum | `sm` buttons are 36px | used in dense rows; **open: raise to 40px** |
| Feed focus | move focus to first new card on Show more | scroll position kept, focus not moved | **open** |
| Gallery screens | ToolArtGallery, StatesGallery | not built | the screens themselves are the review; add if needed |
| Public page | privacy note, sign-in primary, sticky phone sign-in bar | hero with two sign-in actions, privacy note, shelf; no sticky sign-in bar | the sticky bar was not needed with the hero actions |

Open items are also listed in PLAN.md.

---

## 19. Checklist before a design change ships

- [ ] No hex colours in components; tokens only from `globals.css`.
- [ ] No shadows on decorative art; no gradients, glows or blur (except the sticky bars).
- [ ] Each screen checked on phone (375px) and desktop (1100px), in light and dark.
- [ ] One primary button per card or screen.
- [ ] Public card: name, category and drawing only.
- [ ] Email appears only in the pickup box (approved or overdue, not yet returned).
- [ ] Nothing under 13px (12px micro labels only where listed); all dates as "Tue 14 Dec".
- [ ] No fake urgency, counts, likes or trending.
- [ ] Status shown by text and icon, not colour alone.
- [ ] Keyboard path works; focus visible; errors linked to fields.
- [ ] Reduced motion and reduced transparency respected.
