import { v } from "convex/values";

/** Enum validators. Convex rejects any other value before a handler runs. */

export const vCategory = v.union(
  v.literal("power_tools"),
  v.literal("hand_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("cleaning"),
  v.literal("other"),
);

export const vCondition = v.union(v.literal("like_new"), v.literal("good"), v.literal("worn"));

export const vToolStatus = v.union(v.literal("active"), v.literal("removed"));

export const vLoanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

export const vAuditAction = v.union(
  v.literal("approve"),
  v.literal("decline"),
  v.literal("mark_returned"),
  v.literal("remove_listing"),
  v.literal("delete_listing"),
  v.literal("set_trusted"),
  v.literal("unset_trusted"),
);

export const vAuditTarget = v.union(v.literal("tool"), v.literal("loan"), v.literal("user"));

export const vNotificationType = v.union(
  v.literal("request_created"),
  v.literal("request_approved"),
  v.literal("request_declined"),
);

export const vOutboxStatus = v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"));

export const vAutomationKind = v.union(v.literal("notification"), v.literal("reminder"));

export const vAutomationStatus = v.union(v.literal("sent"), v.literal("failed"));
