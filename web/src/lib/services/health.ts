/**
 * Provider 健康检查：发起一次轻量请求（HEAD baseUrl 或 GET /models 之类的探测路径）
 * 写入 ProviderHealth 记录，便于后台展示历史可用率
 */
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

const TIMEOUT_MS = 8_000;

export async function checkProviderHealth(providerId: string): Promise<{
  ok: boolean;
  latencyMs?: number;
  message?: string;
}> {
  const p = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  if (!p) return { ok: false, message: "Provider 不存在" };

  const url = p.baseUrl.replace(/\/$/, "");
  const startedAt = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let result: { ok: boolean; latencyMs?: number; message?: string };
  try {
    // 用 HEAD 请求探测 baseUrl —— 大多数中转站会返回 200/401/404，足以判定可达
    const apiKey = decryptSecret(p.apiKeyEnc);
    const res = await fetch(url, {
      method: "HEAD",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: ctrl.signal,
    });
    const latencyMs = Date.now() - startedAt;
    // 5xx 视为异常；4xx（401/403/404）通常意味着服务在线但需要正确路径，仍判定为「可达」
    if (res.status >= 500) {
      result = { ok: false, latencyMs, message: `HTTP ${res.status}` };
    } else {
      result = { ok: true, latencyMs, message: `HTTP ${res.status}` };
    }
  } catch (e) {
    result = {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: (e as Error).message ?? "请求失败",
    };
  } finally {
    clearTimeout(timer);
  }

  await prisma.providerHealth.create({
    data: {
      providerId,
      ok: result.ok,
      latencyMs: result.latencyMs,
      message: result.message?.slice(0, 500),
    },
  });
  return result;
}

export async function getRecentHealth(providerId: string, limit = 20) {
  return prisma.providerHealth.findMany({
    where: { providerId },
    orderBy: { checkedAt: "desc" },
    take: limit,
  });
}
