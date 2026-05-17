import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/health — 健康检查端点
 *
 * 检查：
 * 1. 应用能响应 HTTP 请求
 * 2. 数据库连接正常（简单查询）
 *
 * 用于：
 * - Docker healthcheck
 * - 负载均衡器探活
 * - 监控告警
 */
export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let dbError: string | null = null;

  try {
    // 简单的 DB 探活查询
    await db.user.count();
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown";
  }

  const latencyMs = Date.now() - start;
  const healthy = dbOk;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latencyMs,
      checks: {
        database: { ok: dbOk, error: dbError },
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
