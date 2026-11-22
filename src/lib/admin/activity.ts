import "server-only";
import { prisma } from "../db";

export async function logActivity(action: string, entity: string, entityId: string | null, summary: string, actor?: string) {
  try {
    await prisma.activityLog.create({ data: { action, entity, entityId, summary: summary.slice(0, 300), actor: actor ?? null } });
  } catch (e) {
    console.error("activity log failed", e);
  }
}
