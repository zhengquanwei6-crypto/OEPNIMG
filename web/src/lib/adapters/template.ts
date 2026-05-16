/**
 * 模板渲染：{{prompt}} / {{size|1024x1024}} / {{API_KEY}}
 *
 * - 仅替换字符串中的占位符
 * - 递归替换对象 / 数组中的字符串
 * - 数字字段：若整体就是 "{{n}}" 这种，会尝试转换为 number
 */

export type TemplateVars = Record<string, string | number | undefined | null>;

const FULL_PLACEHOLDER = /^\{\{\s*([\w.]+)(?:\|([^}]*))?\s*\}\}$/;
const INLINE_PLACEHOLDER = /\{\{\s*([\w.]+)(?:\|([^}]*))?\s*\}\}/g;

function lookup(vars: TemplateVars, key: string): string | number | undefined {
  // 支持 dot path（仅展开扁平 key —— 复杂嵌套留给后续）
  if (key in vars) return vars[key] ?? undefined;
  return undefined;
}

function renderString(input: string, vars: TemplateVars): string | number {
  // 整体是单个占位符 → 保留类型（数字会被转回 number）
  const full = input.match(FULL_PLACEHOLDER);
  if (full) {
    const [, key, def] = full;
    const v = lookup(vars, key);
    if (v === undefined || v === null || v === "") {
      if (def === undefined) return "";
      // 默认值若是纯数字字符串，转回 number
      const n = Number(def);
      return def !== "" && !Number.isNaN(n) ? n : def;
    }
    return v;
  }
  // 内联替换 → 始终是字符串
  return input.replace(INLINE_PLACEHOLDER, (_match, key: string, def?: string) => {
    const v = lookup(vars, key);
    if (v === undefined || v === null || v === "") return def ?? "";
    return String(v);
  });
}

export function renderTemplate<T>(value: T, vars: TemplateVars): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return renderString(value, vars) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => renderTemplate(v, vars))
      .filter((v) => v !== "" && v !== undefined && v !== null) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const rendered = renderTemplate(v, vars);
      // 跳过空字符串字段（避免 size="" 这种污染请求）
      if (rendered === "" || rendered === undefined || rendered === null) continue;
      out[k] = rendered;
    }
    return out as unknown as T;
  }
  return value;
}
