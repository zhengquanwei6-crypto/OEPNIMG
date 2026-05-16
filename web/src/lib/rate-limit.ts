/**
 * 进程内限流（开发/单实例够用；生产多实例请换 Redis）
 *
 *   const rl = limit("generate", 10, 60_000)  // 60 秒内 10 次
 *   const r  = rl.check(`user:${id}`)
 *   if (!r.ok) throw new HttpError(429, `请稍后再试 (${r.retryAfterSec}s)`)
 */
import { HttpError } from "@/lib/session";

interface Bucket {
  count: number;
  resetAt: number;
}

const STORES = new Map<string, Map<string, Bucket>>();

function purge(store: Map<string, Bucket>, now: number) {
  if (store.size < 1024) return;
  for (const [k, b] of store) {
    if (b.resetAt < now) store.delete(k);
  }
}

export function limit(scope: string, max: number, windowMs: number) {
  let store = STORES.get(scope);
  if (!store) {
    store = new Map();
    STORES.set(scope, store);
  }
  return {
    check(key: string) {
      const now = Date.now();
      purge(store!, now);
      const b = store!.get(key);
      if (!b || b.resetAt < now) {
        store!.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true as const, remaining: max - 1, retryAfterSec: 0 };
      }
      if (b.count >= max) {
        return {
          ok: false as const,
          remaining: 0,
          retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
        };
      }
      b.count++;
      return { ok: true as const, remaining: max - b.count, retryAfterSec: 0 };
    },
  };
}

export function assertLimit(args: {
  scope: string;
  key: string;
  max: number;
  windowMs: number;
}) {
  const r = limit(args.scope, args.max, args.windowMs).check(args.key);
  if (!r.ok) {
    throw new HttpError(
      429,
      `操作过于频繁，请 ${r.retryAfterSec} 秒后重试`,
    );
  }
}

export function clientKey(req: Request, sessionUserId?: string): string {
  if (sessionUserId) return `u:${sessionUserId}`;
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "anon";
  return `ip:${ip}`;
}
