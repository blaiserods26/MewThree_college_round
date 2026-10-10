import type { AuditAction, AuditActor, AuditEvent } from "./types.js";

export interface CreateAuditEventInput {
  websiteId: string;
  entityType: "patch" | "release" | "verification";
  entityId: string;
  action: AuditAction;
  actor: AuditActor;
  details?: {
    fromStatus?: string;
    toStatus?: string;
    version?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
  timestamp?: string;
}

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  const ts = input.timestamp || new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return {
    id: `audit-${Date.now()}-${randomSuffix}`,
    websiteId: input.websiteId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actor: input.actor,
    timestamp: ts,
    details: input.details || {},
  };
}
