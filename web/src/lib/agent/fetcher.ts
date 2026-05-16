/**
 * 文档抓取器 —— 拿到任意 URL 的 HTML / Markdown / OpenAPI YAML/JSON
 *
 * 安全：
 *   - 拒绝内网/回环地址（防 SSRF）
 *   - 限制响应大小（FETCH_MAX_BYTES）
 *   - 超时（FETCH_TIMEOUT_MS）
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface FetchedDoc {
  url: string;
  contentType: string;
  status: number;
  bytes: number;
  rawContent: string;
  /** 是否为结构化文档（OpenAPI 等） */
  structured: boolean;
}

const PRIVATE_CIDRS = [
  // IPv4
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  // IPv6
  /^::1$/,
  /^fc/i,
  /^fe80:/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_CIDRS.some((re) => re.test(ip));
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname;
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("禁止访问私有/内网地址");
    }
    return;
  }
  // 拒绝明显的本地域名
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("禁止访问本地域名");
  }
  try {
    const records = await dnsLookup(host, { all: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        throw new Error(`域名 ${host} 解析到私有地址，已拒绝`);
      }
    }
  } catch (e) {
    // DNS 失败 → 让 fetch 自然报错
    if ((e as Error).message?.startsWith("禁止")) throw e;
  }
}

export async function fetchDoc(input: string): Promise<FetchedDoc> {
  const url = new URL(input);
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("仅支持 http(s) 协议");
  }
  await assertPublicHost(url);

  const timeoutMs = Number(process.env.FETCH_TIMEOUT_MS ?? 20_000);
  const maxBytes = Number(process.env.FETCH_MAX_BYTES ?? 2_000_000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "OEPNIMG-DocFetcher/1.0 (+https://github.com/zhengquanwei6-crypto/OEPNIMG)",
        Accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,application/yaml;q=0.9,text/markdown;q=0.9,*/*;q=0.5",
      },
    });
    const contentType = res.headers.get("content-type") ?? "text/html";

    // 流式读取并截断
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return finalize(url.href, contentType, res.status, text);
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.length;
      if (received > maxBytes) {
        chunks.push(value.slice(0, value.length - (received - maxBytes)));
        break;
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const text = buf.toString("utf8");
    return finalize(url.href, contentType, res.status, text);
  } finally {
    clearTimeout(timer);
  }
}

function finalize(
  url: string,
  contentType: string,
  status: number,
  rawContent: string,
): FetchedDoc {
  const ct = contentType.toLowerCase();
  const looksOpenApi =
    /openapi|swagger/i.test(rawContent.slice(0, 2048)) &&
    (ct.includes("json") || ct.includes("yaml") || /paths\s*:/.test(rawContent.slice(0, 4096)));
  return {
    url,
    contentType,
    status,
    bytes: Buffer.byteLength(rawContent, "utf8"),
    rawContent,
    structured: looksOpenApi || ct.includes("json") || ct.includes("yaml"),
  };
}
