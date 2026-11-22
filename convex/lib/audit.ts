/**
 * Audit log (SECURITY.md rule 9). Records who did what to which record, and
 * when. It never stores emails or other personal details: ids and an optional
 * short admin reason only.
 */
import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { vAuditAction, vAuditTarget } from "./validators";

export type AuditEntry = {
  actorId: Id<"users">;
  action: Infer<typeof vAuditAction>;
  targetType: Infer<typeof vAuditTarget>;
  targetId: string;
  /** Already cleaned and length-checked by the caller (validate.cleanAdminReason). */
  reason?: string;
};

export async function writeAudit(ctx: MutationCtx, entry: AuditEntry): Promise<Id<"auditLog">> {
  return await ctx.db.insert("auditLog", { ...entry, at: Date.now() });
}
