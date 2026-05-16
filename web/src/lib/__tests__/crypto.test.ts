import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "../crypto";

beforeAll(() => {
  process.env.MASTER_KEY =
    process.env.MASTER_KEY ?? "test-master-key-for-vitest-please-change-32+chars";
});

describe("crypto", () => {
  it("加密-解密往返", () => {
    const plain = "sk-1234567890abcdef";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("空字符串处理", () => {
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret("")).toBe("");
  });

  it("两次加密同一明文产生不同密文（IV 随机）", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("篡改密文 → 解密失败", () => {
    const enc = encryptSecret("secret");
    const tampered = enc.slice(0, -3) + "AAA";
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("maskSecret 保留首尾", () => {
    expect(maskSecret("sk-1234567890abcdef")).toBe("sk-••••••cdef");
    expect(maskSecret("short")).toBe("••••");
    expect(maskSecret("")).toBe("");
  });
});
