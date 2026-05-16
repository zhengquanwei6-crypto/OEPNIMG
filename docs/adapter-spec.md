# ProviderAdapter 规范 v1

本规范定义 OEPNIMG 中"API 中转站适配器"的 JSON 结构。LLM 助手必须输出符合本规范的 JSON。

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 全局唯一 slug，如 `openai-relay-v1` |
| `name` | string | 是 | 展示名 |
| `baseUrl` | string | 是 | 不带尾斜杠 |
| `auth` | object | 是 | 见下文 |
| `capabilities` | string[] | 是 | `text-to-image` / `image-to-image` / `upscale` / `inpaint` |
| `models` | Model[] | 是 | 至少一个 |
| `headers` | object | 否 | 全局自定义 headers |
| `notes` | string | 否 | LLM 解析时的备注 |

## auth

```ts
type Auth =
  | { type: "bearer"; valueTemplate?: string }       // 默认 "Bearer {API_KEY}"
  | { type: "header"; key: string; valueTemplate: string }
  | { type: "query"; key: string }
  | { type: "none" };
```

## Model

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 调用时使用的 model id |
| `displayName` | string | 是 | UI 展示名 |
| `capability` | string | 是 | 同 capabilities |
| `endpoint` | `{ method, path }` | 是 | path 相对 baseUrl |
| `request.contentType` | string | 否 | 默认 `application/json` |
| `request.bodyTemplate` | object | 是 | 含 `{{var}}` 占位符 |
| `request.queryTemplate` | object | 否 | URL 查询参数模板 |
| `response.type` | `sync` \| `async-polling` | 是 | |
| `response.imageUrlPath` | string | sync 必填 | JSONPath，支持 `[*]` |
| `response.errorPath` | string | 否 | 出错时 message 路径 |
| `response.polling` | Polling | async 必填 | 轮询配置 |

## Polling

```ts
type Polling = {
  endpoint: { method: "GET" | "POST"; path: string }; // 含 {{taskId}}
  taskIdPath: string;                                 // 提交响应中的任务 ID
  intervalMs: number;                                 // 默认 3000
  timeoutMs: number;                                  // 默认 600000
  statusPath: string;
  doneStatuses: string[];
  failStatuses: string[];
  imageUrlPath: string;
  progressPath?: string;                              // 0-100
};
```

## 模板变量

`bodyTemplate` / `queryTemplate` 支持以下变量：

| 变量 | 说明 |
|---|---|
| `{{prompt}}` | 用户提示词（必填） |
| `{{negativePrompt}}` | 反向提示词 |
| `{{size}}` | 如 `1024x1024` |
| `{{n}}` | 生成数量 |
| `{{seed}}` | 随机种子 |
| `{{quality}}` | 质量档位 |
| `{{style}}` | 风格 |
| `{{imageUrl}}` | 输入图（图生图 / 局部重绘） |
| `{{maskUrl}}` | 蒙版（局部重绘） |
| `{{API_KEY}}` | 自动注入 |
| `{{var\|default}}` | 缺省值语法 |

## 完整示例

见 [`architecture.md` §二](./architecture.md#二核心抽象provideradapter)。

## 校验

服务端使用 Zod 严格校验。LLM 输出后会执行：
1. Schema 校验（结构）
2. URL 可达性检查（HEAD /）
3. 干跑：用最小参数调用一次，验证响应路径
