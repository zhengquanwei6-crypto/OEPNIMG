/**
 * 对敏感字段（如 API Key）做 AES-256-GCM 加密。
 * 主密钥来自环境变量 MASTER_KEY（hex 或 base64，长度需 ≥ 32 字节解析后）。
 *
 * 存储格式（字符串）： v1:<iv-base64>:<tag-base64>:<ciphertext-base64>
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.MASTER_KEY ?? "";
  if (!raw) {
    throw new Error(
      "MASTER_KEY 未设置：请在 .env 中配置 32 字节以上的随机字符串",
    );
  }
  // 直接对原始字符串做 sha256 派生 32 字节密钥（允许任意长度输入）
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("无效的加密载荷");
  }
  const [, ivB64, tagB64, encB64] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** 用于 UI 展示：仅显示最后 4 位 */
export function maskSecret(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••";
  return `${plain.slice(0, 3)}••••••${plain.slice(-4)}`;
}
