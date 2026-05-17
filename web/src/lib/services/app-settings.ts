/**
 * AppSetting 服务
 *
 * 读取优先级：DB AppSetting 表 > process.env > 默认值
 * 写入：写入 DB（不修改 .env 文件），立即生效
 *
 * 这样做到了"不修改文件也能完成日常操作"的核心需求。
 */

import { db } from "@/lib/db";

// ─── 已知设置项及其元数据 ───
export interface SettingDef {
  key: string;
  envKey?: string; // 对应的 process.env 键（fallback）
  defaultValue: string;
  valueType: "string" | "number" | "boolean" | "json" | "secret";
  description: string;
  sensitive: boolean;
}

export const SETTING_DEFS: SettingDef[] = [
  {
    key: "admin_password",
    envKey: "ADMIN_PASSWORD",
    defaultValue: "admin1234",
    valueType: "secret",
    description: "管理员登录密码（修改后需要重新登录）",
    sensitive: true,
  },
  {
    key: "session_secret",
    envKey: "SESSION_SECRET",
    defaultValue: "",
    valueType: "secret",
    description: "Session cookie 加密密钥（≥32 字符）",
    sensitive: true,
  },
  {
    key: "master_key",
    envKey: "MASTER_KEY",
    defaultValue: "",
    valueType: "secret",
    description: "API Key 字段加密密钥（≥32 字符）",
    sensitive: true,
  },
  {
    key: "agent_base_url",
    envKey: "AGENT_BASE_URL",
    defaultValue: "https://api.openai.com/v1",
    valueType: "string",
    description: "LLM 助手 API 基础 URL",
    sensitive: false,
  },
  {
    key: "agent_api_key",
    envKey: "AGENT_API_KEY",
    defaultValue: "",
    valueType: "secret",
    description: "LLM 助手 API Key",
    sensitive: true,
  },
  {
    key: "agent_model",
    envKey: "AGENT_MODEL",
    defaultValue: "gpt-4o-mini",
    valueType: "string",
    description: "LLM 助手使用的模型",
    sensitive: false,
  },
  {
    key: "cookie_secure",
    envKey: "COOKIE_SECURE",
    defaultValue: "false",
    valueType: "boolean",
    description: "Cookie Secure 属性（HTTPS 环境设为 true）",
    sensitive: false,
  },
  {
    key: "fetch_timeout_ms",
    envKey: "FETCH_TIMEOUT_MS",
    defaultValue: "20000",
    valueType: "number",
    description: "文档抓取超时（毫秒）",
    sensitive: false,
  },
  {
    key: "fetch_max_bytes",
    envKey: "FETCH_MAX_BYTES",
    defaultValue: "2000000",
    valueType: "number",
    description: "文档抓取最大字节数",
    sensitive: false,
  },
  {
    key: "login_rate_limit_max",
    envKey: undefined,
    defaultValue: "5",
    valueType: "number",
    description: "登录限流：每 IP 每窗口最大尝试次数",
    sensitive: false,
  },
  {
    key: "login_rate_limit_window_ms",
    envKey: undefined,
    defaultValue: "900000",
    valueType: "number",
    description: "登录限流：窗口时长（毫秒，默认 15 分钟）",
    sensitive: false,
  },
  {
    key: "default_provider_id",
    envKey: undefined,
    defaultValue: "",
    valueType: "string",
    description: "默认 Provider ID（前台新对话使用）",
    sensitive: false,
  },
  {
    key: "site_notice",
    envKey: undefined,
    defaultValue: "",
    valueType: "string",
    description: "站点公告（显示在前台顶部，为空则不显示）",
    sensitive: false,
  },
];

// ─── 内存缓存（进程级，重启自动失效）───
const cache = new Map<string, { value: string; expiry: number }>();
const CACHE_TTL_MS = 30_000; // 30 秒

/**
 * 获取单个设置值
 * 优先级：DB > env > default
 */
export async function getSetting(key: string): Promise<string> {
  // 1. 缓存
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  // 2. DB
  try {
    const row = await db.appSetting.findUnique({ where: { key } });
    if (row) {
      cache.set(key, { value: row.value, expiry: Date.now() + CACHE_TTL_MS });
      return row.value;
    }
  } catch {
    // DB 可能还没迁移，fallback
  }

  // 3. env fallback
  const def = SETTING_DEFS.find((d) => d.key === key);
  if (def?.envKey && process.env[def.envKey]) {
    const val = process.env[def.envKey]!;
    cache.set(key, { value: val, expiry: Date.now() + CACHE_TTL_MS });
    return val;
  }

  // 4. default
  const defaultVal = def?.defaultValue ?? "";
  cache.set(key, { value: defaultVal, expiry: Date.now() + CACHE_TTL_MS });
  return defaultVal;
}

/**
 * 获取多个设置（批量）
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  // 尝试一次批量查 DB
  try {
    const rows = await db.appSetting.findMany({ where: { key: { in: keys } } });
    for (const row of rows) {
      result[row.key] = row.value;
      cache.set(row.key, { value: row.value, expiry: Date.now() + CACHE_TTL_MS });
    }
  } catch {
    // fallback below
  }

  // 补全缺失的
  for (const key of keys) {
    if (!(key in result)) {
      result[key] = await getSetting(key);
    }
  }
  return result;
}

/**
 * 获取数字型设置
 */
export async function getSettingNumber(key: string, fallback: number = 0): Promise<number> {
  const v = await getSetting(key);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 获取布尔型设置
 */
export async function getSettingBool(key: string): Promise<boolean> {
  const v = await getSetting(key);
  return v === "true" || v === "1" || v === "yes";
}

/**
 * 写入设置（upsert 到 DB）
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const def = SETTING_DEFS.find((d) => d.key === key);
  await db.appSetting.upsert({
    where: { key },
    create: {
      key,
      value,
      valueType: def?.valueType ?? "string",
      description: def?.description,
      sensitive: def?.sensitive ?? false,
    },
    update: { value },
  });
  // 立即刷新缓存
  cache.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
}

/**
 * 批量写入设置
 */
export async function setSettings(entries: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await setSetting(key, value);
  }
}

/**
 * 获取所有设置（admin 面板用）
 * 敏感字段的值会被 mask
 */
export async function getAllSettings(): Promise<
  Array<{ key: string; value: string; valueType: string; description: string | null; sensitive: boolean }>
> {
  const allDefs = SETTING_DEFS;
  const dbRows = await db.appSetting.findMany().catch(() => [] as any[]);
  const dbMap = new Map(dbRows.map((r: any) => [r.key, r.value]));

  return allDefs.map((def) => {
    let value: string;
    if (dbMap.has(def.key)) {
      value = dbMap.get(def.key)!;
    } else if (def.envKey && process.env[def.envKey]) {
      value = process.env[def.envKey]!;
    } else {
      value = def.defaultValue;
    }

    return {
      key: def.key,
      value: def.sensitive ? (value ? "••••••••" : "") : value,
      valueType: def.valueType,
      description: def.description ?? null,
      sensitive: def.sensitive,
    };
  });
}

/**
 * 清除缓存（用于测试或强制刷新）
 */
export function clearSettingsCache(): void {
  cache.clear();
}
