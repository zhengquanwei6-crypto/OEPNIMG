/**
 * 极简 JSONPath：足够覆盖 Adapter 规范中的写法
 *   - "data.images[0].url"
 *   - "data[*].url"          → 返回数组
 *   - "result"
 *   - "error.message"
 *
 * 复杂场景统一交给 jsonpath-plus（仅在显式 "$." 开头时启用）。
 */
import { JSONPath } from "jsonpath-plus";

function isComplex(path: string): boolean {
  return path.startsWith("$.") || path.includes("..") || /\[\?\(/.test(path);
}

/** 返回 string | string[] | undefined */
export function extractByPath(
  obj: unknown,
  path: string,
): string | string[] | undefined {
  if (obj == null || !path) return undefined;
  if (isComplex(path)) {
    try {
      const r = JSONPath({ path, json: obj as object, wrap: false });
      if (r === undefined || r === null) return undefined;
      if (Array.isArray(r)) return r.map(String);
      return String(r);
    } catch {
      return undefined;
    }
  }
  // 简单解析
  const tokens = parseTokens(path);
  const collected = walk([obj], tokens);
  if (collected.length === 0) return undefined;
  if (collected.length === 1) return toStringSafe(collected[0]);
  return collected.map(toStringSafe).filter(Boolean) as string[];
}

type Token = { kind: "key"; name: string } | { kind: "index"; i: number } | { kind: "wildcard" };

function parseTokens(path: string): Token[] {
  const tokens: Token[] = [];
  // 切分 a.b[0].c[*]
  const parts = path.split(".");
  for (const part of parts) {
    if (!part) continue;
    const re = /([^\[\]]+)|\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(part)) !== null) {
      if (m[1]) {
        tokens.push({ kind: "key", name: m[1] });
      } else if (m[2] !== undefined) {
        const inner = m[2];
        if (inner === "*") tokens.push({ kind: "wildcard" });
        else tokens.push({ kind: "index", i: Number(inner) });
      }
    }
  }
  return tokens;
}

function walk(curr: unknown[], tokens: Token[]): unknown[] {
  let out: unknown[] = curr;
  for (const t of tokens) {
    const next: unknown[] = [];
    for (const node of out) {
      if (node == null) continue;
      if (t.kind === "key") {
        if (typeof node === "object") {
          const v = (node as Record<string, unknown>)[t.name];
          if (v !== undefined) next.push(v);
        }
      } else if (t.kind === "index") {
        if (Array.isArray(node) && t.i < node.length) next.push(node[t.i]);
      } else if (t.kind === "wildcard") {
        if (Array.isArray(node)) next.push(...node);
        else if (typeof node === "object") next.push(...Object.values(node as object));
      }
    }
    out = next;
    if (out.length === 0) break;
  }
  return out;
}

function toStringSafe(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
