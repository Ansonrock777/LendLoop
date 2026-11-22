import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vAuditAction,
  vAuditTarget,
  vAutomationKind,
  vAutomationStatus,
  vCategory,
  vCondition,
  vLoanStatus,
  vNotificationType,
  vOutboxStatus,
  vToolStatus,
} from "./lib/validators";

/**
 * Data model. Roles are NOT stored here: admin comes from the signed Clerk JWT
 * (`role` claim), so nothing in the app can grant it (SECURITY.md rule 10).
 * Dates the user picks are ISO strings (yyyy-mm-dd); system times are ms epoch.
 */
export default defineSchema({
  users: defineTable({
    /** Convex identity key ("issuer|subject"). Demo seed users use "demo|<slug>", which no real token can produce. */
    tokenIdentifier: v.string(),
    firstName: v.string(),
    /** Only ever returned to the other party of an approved, not-yet-returned loan. */
    email: v.string(),
    isTrustedLender: v.boolean(),
    isDemo: v.optional(v.boolean()),
  }).index("by_token", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: vCategory,
    condition: vCondition,
    description: v.string(),
    status: vToolStatus,
  })
    // Newest first comes from _creationTime, which every index ends with.
    .index("by_status", ["status"])
    .index("by_category_status", ["category", "status"])
    .index("by_owner_status", ["ownerId", "status"]),

  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: vLoanStatus,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_borrower_status", ["borrowerId", "status"])
    .index("by_lender", ["lenderId"])
    .index("by_lender_status", ["lenderId", "status"])
    .index("by_tool_status", ["toolId", "status"])
    .index("by_status_end", ["status", "endDate"]),

  /** Who did what (SECURITY.md rule 9). Never stores emails. */
  auditLog: defineTable({
    actorId: v.id("users"),
    action: vAuditAction,
    targetType: vAuditTarget,
    targetId: v.string(),
    reason: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_target", ["targetType", "targetId"])
    .index("by_at", ["at"]),

  /** Outgoing notifications to n8n, retried with backoff (rule 6). eventId is the idempotency key. */
  outbox: defineTable({
    eventId: v.string(),
    loanId: v.id("loans"),
    type: vNotificationType,
    status: vOutboxStatus,
    attempts: v.number(),
    nextAttemptAt: v.number(),
    /** Short, sanitised message: no addresses, no stack traces. */
    lastError: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_status", ["status"])
    .index("by_loan", ["loanId"]),

  /** One row per idempotency key: retries update the row instead of adding one (rule 5). */
  automationEvents: defineTable({
    idempotencyKey: v.string(),
    loanId: v.id("loans"),
    kind: vAutomationKind,
    status: vAutomationStatus,
    detail: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_key", ["idempotencyKey"])
    .index("by_loan", ["loanId"])
    .index("by_status", ["status"]),

  /**
   * Failures reported by the n8n error workflow (rule 6), when a workflow breaks
   * before it can write a per-loan status. Short, sanitised text only.
   */
  workflowErrors: defineTable({
    workflow: v.string(),
    executionId: v.optional(v.string()),
    message: v.string(),
    at: v.number(),
  }).index("by_at", ["at"]),
});
