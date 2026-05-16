/**
 * ProviderAdapter Zod 校验 —— 与 docs/adapter-spec.md 保持一致
 *
 * LLM 输出的 JSON 必须通过此 schema 才能落库。
 */
import { z } from "zod";

export const CapabilityEnum = z.enum([
  "text-to-image",
  "image-to-image",
  "upscale",
  "inpaint",
]);
export type Capability = z.infer<typeof CapabilityEnum>;

const HttpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const AuthSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bearer"),
    valueTemplate: z.string().default("Bearer {API_KEY}"),
  }),
  z.object({
    type: z.literal("header"),
    key: z.string().min(1),
    valueTemplate: z.string().min(1),
  }),
  z.object({
    type: z.literal("query"),
    key: z.string().min(1),
  }),
  z.object({ type: z.literal("none") }),
]);
export type AdapterAuth = z.infer<typeof AuthSchema>;

const EndpointSchema = z.object({
  method: HttpMethod,
  /** 相对 baseUrl，可含 {{taskId}} 等占位符 */
  path: z.string().min(1),
});

const PollingSchema = z.object({
  endpoint: EndpointSchema,
  taskIdPath: z.string().min(1).optional(), // 已在父级提取，但允许重复指定
  intervalMs: z.number().int().min(500).max(30_000).default(3000),
  timeoutMs: z.number().int().min(10_000).max(1_800_000).default(600_000),
  statusPath: z.string().min(1),
  doneStatuses: z.array(z.string()).min(1),
  failStatuses: z.array(z.string()).default([]),
  imageUrlPath: z.string().min(1),
  progressPath: z.string().optional(),
  /** 部分中转站需要在轮询请求中传 body / 额外 header */
  bodyTemplate: z.record(z.string(), z.unknown()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

const RequestSchema = z.object({
  contentType: z.string().default("application/json"),
  bodyTemplate: z.record(z.string(), z.unknown()).default({}),
  queryTemplate: z.record(z.string(), z.unknown()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

const ResponseSyncSchema = z.object({
  type: z.literal("sync"),
  imageUrlPath: z.string().min(1),
  errorPath: z.string().optional(),
});

const ResponseAsyncSchema = z.object({
  type: z.literal("async-polling"),
  taskIdPath: z.string().min(1),
  errorPath: z.string().optional(),
  polling: PollingSchema,
});

const ResponseSchema = z.discriminatedUnion("type", [
  ResponseSyncSchema,
  ResponseAsyncSchema,
]);

export const ModelSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  capability: CapabilityEnum,
  endpoint: EndpointSchema,
  request: RequestSchema,
  response: ResponseSchema,
  /** 估算成本（USD） */
  costEstimate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type AdapterModel = z.infer<typeof ModelSchema>;

export const ProviderAdapterSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/i, "id 必须为字母数字或短横线"),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  auth: AuthSchema,
  capabilities: z.array(CapabilityEnum).min(1),
  models: z.array(ModelSchema).min(1),
  headers: z.record(z.string(), z.string()).optional(),
  notes: z.string().optional(),
  /** 适配器版本，可被 LLM 自动填充 */
  version: z.string().default("1.0.0"),
});

export type ProviderAdapter = z.infer<typeof ProviderAdapterSchema>;

/** 安全解析：返回 { ok, data | error } */
export function parseAdapter(input: unknown):
  | { ok: true; data: ProviderAdapter }
  | { ok: false; error: string; issues: z.ZodIssue[] } {
  const r = ProviderAdapterSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return {
    ok: false,
    error: r.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; "),
    issues: r.error.issues,
  };
}
