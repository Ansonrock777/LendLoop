/**
 * View types for the UI, taken straight from what the Convex queries return
 * (their `returns` validators). If a query's shape changes, the screens stop
 * compiling instead of silently showing the wrong thing.
 * Category and condition are the stored slugs from convex/lib/domain.ts.
 */
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { Category, Condition } from "@/convex/lib/domain";

export type { Category, Condition };
export type CategoryFilter = "all" | Category;

/** Everything a signed-out visitor may ever receive (SECURITY.md rule 2): _id, name, category. */
export type PublicTool = FunctionReturnType<typeof api.tools.publicList>["page"][number];

/** Signed-in view of a tool in the feed. */
export type Tool = FunctionReturnType<typeof api.tools.listAvailable>["page"][number];

/** One of the caller's own listings. */
export type MyListing = FunctionReturnType<typeof api.tools.mine>[number];

/** What the tool form edits. `category` is "" until the person picks one. */
export interface ToolDraft {
  name: string;
  category: Category | "";
  condition: Condition;
  description: string;
}

/**
 * A loan as either party (or an admin) sees it. `pickupEmail` is the OTHER person's
 * email: the server sets it only while the loan is approved or overdue, never for admins.
 */
export type Loan = FunctionReturnType<typeof api.loans.get>;
/** "overdue" is derived on the server (approved + end date passed), never stored. */
export type LoanViewStatus = Loan["status"];
export type Perspective = "borrower" | "lender";

/** One email or reminder about a loan. The UI builds the sentence from kind + state. */
export type AutomationEvent = NonNullable<Loan["automation"]>[number];

export type AdminListing = FunctionReturnType<typeof api.admin.listings>["page"][number];
export type AdminLender = FunctionReturnType<typeof api.admin.lenders>[number];
export type AuditEntry = FunctionReturnType<typeof api.admin.auditLog>["page"][number];
/** Short, sanitised message. No addresses, no stack traces. */
export type FailedAutomation = FunctionReturnType<typeof api.admin.failedAutomations>[number];
