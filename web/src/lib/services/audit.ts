/**
 * 审计日志服务
 *
 * 所有关键操作（登录/改设置/改 Provider/改密码等）都通过这里记录。
 * 用于后台 admin 页面展示"谁 什么时间 做了什么"。
 */

import { db } from "@/lib/db";

export interface AuditEntry {
  userId?: string | null;
  username?: string | null;
  action: string;
  target?: string | null;
  detail?: string | null;
  ip?: string | null;
}

/**
 * 记录一条审计日志（fire-and-forget，不阻塞主流程）
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        username: entry.username ?? null,
        action: entry.action,
        target: entry.target ?? null,
        detail: entry.detail ?? null,
        ip: entry.ip ?? null,
      },
    });
  } catch (e) {
    // 审计日志不应该阻塞主流程
    console.error("[audit] failed to write:", e);
  }
}

/**
 * 查询审计日志（分页）
 */
export async function queryAuditLogs(opts: {
  page?: number;
  pageSize?: number;
  action?: string;
  userId?: string;
}) {
  const page = opts.page ?? 1;
  const pageSize = Math.min(opts.pageSize ?? 50, 200);
  const skip = (page - 1) * pageSize;

  const where: Record<string, any> = {};
  if (opts.action) where.action = opts.action;
  if (opts.userId) where.userId = opts.userId;

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
