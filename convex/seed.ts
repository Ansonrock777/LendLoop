/**
 * Demo data (D12). INTERNAL ONLY: not callable from the browser or over HTTP
 * (SECURITY.md rule 10). Run from a terminal:
 *
 *   npx convex run seed:run
 *   npx convex run seed:run '{"realLenderEmails":["lender@…"],"realBorrowerEmails":["borrower@…"]}'
 *   npx convex run seed:clear
 *
 * Demo neighbours use tokenIdentifier "demo|<slug>", which no real Clerk token
 * can produce, and `.test` emails, which can never receive mail. The optional
 * emails (up to 2 lenders and 2 borrowers, e.g. the reviewer set and Anson's
 * own set, D20) attach tools and loans to real accounts. Each must have signed
 * in once, so the demo lender can approve requests.
 */
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Category, Condition, LoanStatus } from "./lib/domain";
import { addDaysIso, todayIso } from "./lib/validate";

const NEIGHBOURS = [
  { slug: "maya", firstName: "Maya", trusted: true },
  { slug: "sam", firstName: "Sam", trusted: true },
  { slug: "aisha", firstName: "Aisha", trusted: false },
  { slug: "tomasz", firstName: "Tomasz", trusted: false },
  { slug: "dev", firstName: "Dev", trusted: true },
  { slug: "ingrid", firstName: "Ingrid", trusted: false },
  { slug: "kofi", firstName: "Kofi", trusted: false },
  { slug: "ruth", firstName: "Ruth", trusted: false },
] as const;

type ToolSeed = [name: string, category: Category, condition: Condition, description: string];

const TOOLS: ToolSeed[] = [
  ["Pressure washer", "cleaning", "good", "Electric, 1800 W, with a patio cleaner head. Needs a garden tap."],
  ["Cordless drill", "power_tools", "like_new", "18 V drill with two batteries and a case of bits."],
  ["Stand mixer", "kitchen", "good", "Five-litre bowl with dough hook, whisk and paddle."],
  ["Step ladder", "hand_tools", "worn", "Four steps, folds flat. A bit scuffed but very steady."],
  ["Lawnmower", "garden", "good", "Electric rotary mower with a grass box. 10 m cable included."],
  ["Camping stove", "camping", "like_new", "Two-ring gas stove with a carry case. Gas not included."],
  ["Jigsaw", "power_tools", "good", "Corded jigsaw with wood and metal blades."],
  ["Wheelbarrow", "garden", "worn", "Single wheel, 90 litres. Tyre needs a little air."],
  ["Carpet cleaner", "cleaning", "good", "Upright machine with a solution tank."],
  ["Four-person tent", "camping", "good", "Pop-up poles, one bedroom and a porch."],
  ["Blender", "kitchen", "like_new", "1.5 litre glass jug. Good for soups and smoothies."],
  ["Spirit level", "hand_tools", "good", "120 cm aluminium level."],
  ["Circular saw", "power_tools", "good", "190 mm blade, corded. Guard works smoothly."],
  ["Hedge trimmer", "garden", "good", "Electric, 55 cm blade. Cable not included."],
  ["Slow cooker", "kitchen", "good", "Six-litre ceramic pot. Feeds a crowd."],
  ["Cool box", "camping", "worn", "40 litres. Lid latch is stiff but holds."],
  ["Vacuum cleaner", "cleaning", "good", "Bagless cylinder vacuum with a crevice tool."],
  ["Garden hose reel", "garden", "good", "30 metres on a wall-mount reel with a spray gun."],
  ["Food dehydrator", "kitchen", "like_new", "Five trays. Lovely for apple rings and herbs."],
  ["Sleeping bag", "camping", "good", "Three-season bag with a stuff sack."],
  ["Orbital sander", "power_tools", "good", "Random orbital sander with a dust bag and spare discs."],
  ["Claw hammer", "hand_tools", "worn", "16 oz with a fibreglass handle."],
  ["Toolbox with sockets", "hand_tools", "good", "Metric sockets, spanners and screwdrivers."],
  ["Wallpaper steamer", "other", "good", "Plate steamer with a hose. Ten minutes to heat."],
  ["Leaf blower", "garden", "like_new", "Light electric blower for autumn lawns."],
  ["Heat gun", "power_tools", "good", "Two heat settings, for stripping paint."],
  ["Folding trestle table", "other", "good", "Seats six. Handy for street parties."],
  ["Mitre saw", "power_tools", "good", "210 mm blade, cuts skirting and picture frames cleanly."],
  ["Paint roller set", "hand_tools", "like_new", "Two rollers, a tray and an extension pole."],
  ["Steam mop", "cleaning", "good", "Two washable pads. Fine on tiles and sealed wood."],
  ["Pasta machine", "kitchen", "good", "Hand-crank, with fettuccine and spaghetti cutters."],
  ["Camping chairs (pair)", "camping", "good", "Fold into shoulder bags."],
  ["Tile cutter", "hand_tools", "good", "Manual, cuts up to 60 cm tiles."],
  ["Loppers", "garden", "worn", "Long-handled, for branches up to 4 cm."],
  ["Window vacuum", "cleaning", "like_new", "Cordless squeegee vacuum. No more streaks."],
  ["Ice cream maker", "kitchen", "good", "Freeze the bowl overnight first."],
  ["Lantern", "camping", "like_new", "Rechargeable LED, three brightness levels."],
  ["Sewing machine", "other", "good", "Basic stitches, comes with spare needles."],
  ["Stud finder", "hand_tools", "good", "Finds wood, metal and live cables."],
  ["Garden sprayer", "garden", "good", "Five-litre pump sprayer."],
];

/** Loan states to create between demo neighbours, relative to today. */
const LOAN_PLAN: { status: LoanStatus; startOffset: number; days: number; overdue?: boolean }[] = [
  { status: "pending", startOffset: 3, days: 3 },
  { status: "pending", startOffset: 7, days: 2 },
  { status: "approved", startOffset: -1, days: 4 },
  { status: "approved", startOffset: -9, days: 5, overdue: true },
  { status: "declined", startOffset: -6, days: 2 },
  { status: "returned", startOffset: -18, days: 3 },
  { status: "cancelled", startOffset: -20, days: 2 },
];

const DAY = 86_400_000;

async function userByEmail(ctx: MutationCtx, email: string): Promise<Doc<"users">> {
  // Seed-only lookup; there is no email index on purpose (nothing in the app looks users up by email).
  const users = await ctx.db.query("users").take(1000);
  const match = users.find((u) => !u.isDemo && u.email.toLowerCase() === email.toLowerCase());
  if (!match) throw new Error(`No signed-in user with that email. Sign in once first.`);
  return match;
}

async function insertLoan(
  ctx: MutationCtx,
  tool: Doc<"tools">,
  borrowerId: Id<"users">,
  plan: (typeof LOAN_PLAN)[number],
  now: number,
): Promise<Id<"loans">> {
  const today = todayIso(now);
  const startDate = addDaysIso(today, plan.startOffset);
  const endDate = addDaysIso(startDate, plan.days);
  const loanId = await ctx.db.insert("loans", {
    toolId: tool._id,
    borrowerId,
    lenderId: tool.ownerId,
    startDate,
    endDate,
    status: plan.status,
    ...(["approved", "declined", "returned"].includes(plan.status) ? { decidedAt: now - 2 * DAY } : {}),
    ...(plan.status === "returned" ? { returnedAt: now - 10 * DAY } : {}),
  });
  const sent = { status: "sent" as const, attempts: 1, nextAttemptAt: now };
  await ctx.db.insert("outbox", { eventId: `seed_${loanId}_req`, loanId, type: "request_created", ...sent });
  if (plan.status === "approved" || plan.status === "returned") {
    await ctx.db.insert("outbox", { eventId: `seed_${loanId}_ok`, loanId, type: "request_approved", ...sent });
  }
  if (plan.status === "declined") {
    await ctx.db.insert("outbox", { eventId: `seed_${loanId}_no`, loanId, type: "request_declined", ...sent });
  }
  if (plan.overdue) {
    const key = `${loanId}:${today}`;
    await ctx.db.insert("automationEvents", { idempotencyKey: key, loanId, kind: "reminder", status: "sent", at: now });
  }
  return loanId;
}

/** Each real lender takes 5 seed tools; each real borrower needs 7 unused demo tools. 2 + 2 fits in 40. */
const MAX_REAL_PER_SIDE = 2;
const TOOLS_PER_REAL_LENDER = 5;

export const run = internalMutation({
  args: {
    realLenderEmails: v.optional(v.array(v.string())),
    realBorrowerEmails: v.optional(v.array(v.string())),
  },
  returns: v.object({ users: v.number(), tools: v.number(), loans: v.number() }),
  handler: async (ctx, { realLenderEmails = [], realBorrowerEmails = [] }) => {
    if (realLenderEmails.length > MAX_REAL_PER_SIDE || realBorrowerEmails.length > MAX_REAL_PER_SIDE) {
      throw new Error(`At most ${MAX_REAL_PER_SIDE} real lenders and ${MAX_REAL_PER_SIDE} real borrowers.`);
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", `demo|${NEIGHBOURS[0].slug}`))
      .unique();
    if (existing) throw new Error("Demo data is already there. Run seed:clear first.");

    const now = Date.now();
    const realLenders = await Promise.all(realLenderEmails.map((e) => userByEmail(ctx, e)));
    const realBorrowers = await Promise.all(realBorrowerEmails.map((e) => userByEmail(ctx, e)));
    const realLenderIds = new Set<string>(realLenders.map((u) => u._id));

    const demoIds: Id<"users">[] = [];
    for (const n of NEIGHBOURS) {
      demoIds.push(
        await ctx.db.insert("users", {
          tokenIdentifier: `demo|${n.slug}`,
          firstName: n.firstName,
          email: `${n.slug}@lendloop.test`,
          isTrustedLender: n.trusted,
          isDemo: true,
        }),
      );
    }

    // First 5 tools per real lender go to them, the rest round-robin to demo neighbours.
    const tools: Doc<"tools">[] = [];
    for (const [i, [name, category, condition, description]] of TOOLS.entries()) {
      const lender = realLenders[Math.floor(i / TOOLS_PER_REAL_LENDER)];
      const ownerId = lender ? lender._id : demoIds[i % demoIds.length];
      const id = await ctx.db.insert("tools", { ownerId, name, category, condition, description, status: "active" });
      tools.push((await ctx.db.get(id))!);
    }

    let loans = 0;
    const demoTools = tools.filter((t) => !realLenderIds.has(t.ownerId));
    // Every state between demo neighbours (borrower = the next neighbour along).
    for (const [i, plan] of LOAN_PLAN.entries()) {
      const tool = demoTools[i];
      const borrower = demoIds[(demoIds.indexOf(tool.ownerId) + 1) % demoIds.length];
      await insertLoan(ctx, tool, borrower, plan, now);
      loans++;
    }
    // Each real lender: requests to answer, one out on loan, one overdue, one returned.
    const lenderPicks = [LOAN_PLAN[0], LOAN_PLAN[1], LOAN_PLAN[2], LOAN_PLAN[3], LOAN_PLAN[5]];
    for (const lender of realLenders) {
      const mine = tools.filter((t) => t.ownerId === lender._id);
      for (const [i, plan] of lenderPicks.entries()) {
        await insertLoan(ctx, mine[i], demoIds[i], plan, now);
        loans++;
      }
    }
    // Each real borrower: one of each state, on its own block of demo tools (no clashes).
    for (const [b, borrower] of realBorrowers.entries()) {
      for (const [i, plan] of LOAN_PLAN.entries()) {
        await insertLoan(ctx, demoTools[LOAN_PLAN.length * (b + 1) + i], borrower._id, plan, now);
        loans++;
      }
    }

    // One failed notification and one failed reminder so the admin view has something to show.
    const someLoan = (await ctx.db.query("loans").order("desc").first())!;
    await ctx.db.insert("outbox", {
      eventId: `seed_${someLoan._id}_failed`,
      loanId: someLoan._id,
      type: "request_created",
      status: "failed",
      attempts: 5,
      nextAttemptAt: now,
      lastError: "Address was rejected by the mail server.",
    });
    await ctx.db.insert("automationEvents", {
      idempotencyKey: `${someLoan._id}:seed-failed`,
      loanId: someLoan._id,
      kind: "reminder",
      status: "failed",
      detail: "Email provider did not answer in time.",
      at: now - DAY,
    });

    return { users: demoIds.length, tools: tools.length, loans };
  },
});

/**
 * Removes demo neighbours and everything that touches their tools or loans,
 * including loans real test accounts have on demo tools and tools the seed gave
 * to a real lender (those were loaned to demo neighbours). Real user rows stay.
 */
export const clear = internalMutation({
  args: {},
  returns: v.object({ users: v.number(), tools: v.number(), loans: v.number() }),
  handler: async (ctx) => {
    const demoUsers = (await ctx.db.query("users").take(1000)).filter((u) => u.isDemo);
    const demoIds = new Set<string>(demoUsers.map((u) => u._id));
    const loans = (await ctx.db.query("loans").take(5000)).filter(
      (l) => demoIds.has(l.borrowerId) || demoIds.has(l.lenderId),
    );
    const toolIds = new Set<string>(loans.map((l) => l.toolId));
    for (const t of await ctx.db.query("tools").take(5000)) {
      if (demoIds.has(t.ownerId)) toolIds.add(t._id);
    }
    // Loans by real users on demo tools.
    for (const l of await ctx.db.query("loans").take(5000)) {
      if (toolIds.has(l.toolId) && !loans.some((x) => x._id === l._id)) loans.push(l);
    }
    for (const l of loans) {
      for (const o of await ctx.db.query("outbox").withIndex("by_loan", (q) => q.eq("loanId", l._id)).take(100)) {
        await ctx.db.delete(o._id);
      }
      for (const e of await ctx.db
        .query("automationEvents")
        .withIndex("by_loan", (q) => q.eq("loanId", l._id))
        .take(100)) {
        await ctx.db.delete(e._id);
      }
      await ctx.db.delete(l._id);
    }
    // Only tools the seed created: owned by demo users, or a seed-named tool a real lender got and that had seed loans.
    let tools = 0;
    for (const id of toolIds) {
      const t = await ctx.db.get(id as Id<"tools">);
      if (t && (demoIds.has(t.ownerId) || TOOLS.some(([name]) => name === t.name))) {
        await ctx.db.delete(t._id);
        tools++;
      }
    }
    for (const u of demoUsers) await ctx.db.delete(u._id);
    return { users: demoUsers.length, tools, loans: loans.length };
  },
});
