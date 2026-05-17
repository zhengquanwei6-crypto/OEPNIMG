/**
 * Admin Guard — 统一的 admin API 鉴权辅助
 *
 * 用法：
 *   import { requireAdmin } from "@/lib/admin-guard";
 *
 *   export async function GET(req: Request) {
 *     const sess = await requireAdmin(req); // 不是 admin 则直接抛 403
 *     // ... 业务逻辑
 *   }
 */

import { getSession, HttpError } from "@/lib/session";

export async function requireAdmin(req?: Request) {
  const sess = await getSession();
  if (!sess.userId) {
    throw new HttpError(401, "请先登录");
  }
  if (sess.role !== "admin") {
    throw new HttpError(403, "权限不足：需要管理员角色");
  }
  return sess;
}

/**
 * 从请求中提取客户端 IP
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}
