import { describe, it, expect } from "vitest";
import { limit } from "../rate-limit";

describe("rate-limit", () => {
  it("窗口内允许 N 次后拒绝", () => {
    const rl = limit("test-1", 3, 60_000);
    expect(rl.check("k1").ok).toBe(true);
    expect(rl.check("k1").ok).toBe(true);
    expect(rl.check("k1").ok).toBe(true);
    const r = rl.check("k1");
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("不同 key 互不影响", () => {
    const rl = limit("test-2", 1, 60_000);
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("b").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
  });

  it("窗口过期后重置", async () => {
    const rl = limit("test-3", 1, 50);
    expect(rl.check("k").ok).toBe(true);
    expect(rl.check("k").ok).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(rl.check("k").ok).toBe(true);
  });
});
