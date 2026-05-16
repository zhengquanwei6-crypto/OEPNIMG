/**
 * 极简 JSONPath：足够覆盖 Adapter 规范中的写法
 *   - "data.images[0].url"
 *   - "data[*].url"                  → 返回数组
 *   - "result"
 *   - "error.message"
 *   - "data.resultJson>>resultUrls[*]"  → 嵌套字符串解 JSON 再取
 *
 * 嵌套语法：用 ">>" 分段，前一段先取出，再当 JSON 字符串解析继续往下取。
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

  // 嵌套字符串解 JSON：a.b>>c[*].url
  if (path.includes(">>")) {
    const segments = path.split(">>");
    let curr: unknown = obj;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].trim();
      if (i > 0) {
        // 前一段返回的是字符串（或字符串数组），需要 JSON parse 后继续
        if (typeof curr === "string") {
          try {
            curr = JSON.parse(curr);
          } catch {
            return undefined;
          }
        } else if (Array.isArray(curr) && curr.every((x) => typeof x === "string")) {
          // 数组：每个元素都 parse
          const parsed: unknown[] = [];
          for (const s of curr) {
            try {
              parsed.push(JSON.parse(s as string));
            } catch {
              return undefined;
            }
          }
          curr = parsed;
        } else {
          return undefined;
        }
      }
      if (!seg) continue;
      const r = extractRaw(curr, seg);
      if (r === undefined) return undefined;
      curr = r;
    }
    if (curr === undefined || curr === null) return undefined;
    if (Array.isArray(curr))
      return curr.map(toStringSafe).filter(Boolean) as string[];
    return toStringSafe(curr);
  }

  return extractByPathSimple(obj, path);
}

function extractByPathSimple(
  obj: unknown,
  path: string,
): string | string[] | undefined {
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
  const tokens = parseTokens(path);
  const collected = walk([obj], tokens);
  if (collected.length === 0) return undefined;
  if (collected.length === 1) return toStringSafe(collected[0]);
  return collected.map(toStringSafe).filter(Boolean) as string[];
}

/** 内部：返回原始值（可能是 object / array / string / number），不做 toString */
function extractRaw(obj: unknown, path: string): unknown {
  if (obj == null || !path) return undefined;
  if (isComplex(path)) {
    try {
      const r = JSONPath({ path, json: obj as object, wrap: false });
      return r ?? undefined;
    } catch {
      return undefined;
    }
  }
  const tokens = parseTokens(path);
  const collected = walk([obj], tokens);
  if (collected.length === 0) return undefined;
  if (collected.length === 1) return collected[0];
  return collected;
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
