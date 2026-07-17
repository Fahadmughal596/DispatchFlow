import { db } from "@/lib/db";

export async function audit(
  actorId: number | null,
  action: string,
  entityType: string,
  entityId?: string | number | null,
  oldValue?: unknown,
  newValue?: unknown
) {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      oldValue: oldValue == null ? undefined : JSON.parse(JSON.stringify(oldValue)),
      newValue: newValue == null ? undefined : JSON.parse(JSON.stringify(newValue))
    }
  });
}
