# OEPNIMG 架构文档

## 一、总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端 (Clients)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  PC 浏览器    │  │  移动浏览器   │  │  Android APK     │   │
│  │  (Next.js)   │  │  (Next.js)   │  │  (Capacitor 壳)  │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼──────────────────┼───────────────────┼─────────────┘
          │                  │                   │
          └──────────────────┼───────────────────┘
                             │ HTTPS (REST + SSE)
┌────────────────────────────▼──────────────────────────────────┐
│                  Next.js 后端 API Routes                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  /api/generate  /api/providers  /api/agent  /api/auth  │   │
│  └────────────────────┬───────────────────────────────────┘   │
│                       │                                        │
│  ┌────────────────────┼───────────────────────────────────┐   │
│  │              核心服务层 (lib/)                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ AdapterRunner│  │  DocAgent    │  │ ProviderRepo │  │   │
│  │  │ (统一执行器) │  │ (LLM 解析)   │  │ (CRUD)       │  │   │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────┬──────────────────────┬───────────────────────────┘
             │                      │
    ┌────────▼────────┐    ┌────────▼─────────────────┐
    │  Prisma + DB    │    │  外部 API 中转站们        │
    │ (Provider/Job)  │    │  OpenAI / MJ / SD 等     │
    └─────────────────┘    └──────────────────────────┘
```

## 二、核心抽象：ProviderAdapter

每一个 API 中转站对应一个 `ProviderAdapter`，由 LLM 助手自动生成或人工编辑。

### Adapter Schema (JSON)

```jsonc
{
  "id": "openai-relay-v1",
  "name": "某中转站 - OpenAI 兼容",
  "baseUrl": "https://api.example-relay.com/v1",
  "auth": {
    "type": "bearer",         // bearer | header | query
    "key": "Authorization",
    "valueTemplate": "Bearer {API_KEY}"
  },
  "capabilities": ["text-to-image", "image-to-image"],
  "models": [
    {
      "id": "dall-e-3",
      "displayName": "DALL·E 3",
      "capability": "text-to-image",
      "endpoint": {
        "method": "POST",
        "path": "/images/generations"
      },
      "request": {
        "contentType": "application/json",
        "bodyTemplate": {
          "model": "dall-e-3",
          "prompt": "{{prompt}}",
          "size": "{{size|1024x1024}}",
          "n": "{{n|1}}",
          "quality": "{{quality|standard}}"
        }
      },
      "response": {
        "type": "sync",          // sync | async-polling
        "imageUrlPath": "data[*].url",
        "errorPath": "error.message"
      }
    },
    {
      "id": "midjourney",
      "capability": "text-to-image",
      "endpoint": { "method": "POST", "path": "/mj/submit/imagine" },
      "request": {
        "bodyTemplate": { "prompt": "{{prompt}}" }
      },
      "response": {
        "type": "async-polling",
        "taskIdPath": "result",
        "polling": {
          "endpoint": { "method": "GET", "path": "/mj/task/{{taskId}}/fetch" },
          "intervalMs": 3000,
          "timeoutMs": 600000,
          "statusPath": "status",
          "doneStatuses": ["SUCCESS"],
          "failStatuses": ["FAILURE"],
          "imageUrlPath": "imageUrl",
          "progressPath": "progress"
        }
      }
    }
  ]
}
```

### 执行流程

```
client.generate({ providerId, modelId, prompt, ... })
   │
   ▼
AdapterRunner.run()
   ├─ 1. 加载 Adapter & Model 定义
   ├─ 2. 渲染 bodyTemplate（变量替换）
   ├─ 3. 注入鉴权头
   ├─ 4. 发送请求
   ├─ 5. 同步：直接解析 imageUrlPath
   │   异步：循环 polling 直至 done/fail/超时
   └─ 6. 持久化 Generation 记录
```

## 三、LLM 文档解析 Agent

```
INPUT: 文档 URL（或粘贴的 markdown / OpenAPI YAML）
   │
   ▼
┌──────────────────────────┐
│ 1. Fetcher                │  抓取并清洗 HTML / 提取 OpenAPI
└──────────────┬───────────┘
               ▼
┌──────────────────────────┐
│ 2. Chunker                │  按章节分片（避免超长上下文）
└──────────────┬───────────┘
               ▼
┌──────────────────────────┐
│ 3. LLM (Function Calling) │  按 ProviderAdapter Schema 输出 JSON
└──────────────┬───────────┘
               ▼
┌──────────────────────────┐
│ 4. Validator              │  Zod 校验 + 干跑测试请求
└──────────────┬───────────┘
               ▼
       AdapterTemplate (草稿)
               │
               ▼
       人工 Review → 保存为 Provider
```

LLM 调用本身也走配置的中转站 —— **平台自举**，验证多源能力。

## 四、数据模型

| 表 | 说明 |
|---|---|
| `Provider` | API 源实例（含 apiKey、baseUrl、关联 Adapter） |
| `Model` | 该 Provider 下的可用模型 |
| `AdapterTemplate` | LLM 生成的适配器模板（版本化、可复制为 Provider） |
| `Generation` | 一次生图任务（含 prompt、参数、结果 URL、耗时、成本） |
| `User` | 用户（单租户也保留扩展位） |
| `ApiDoc` | LLM 抓取的原始文档缓存 |

## 五、移动端

### 技术选型

- **壳**：Capacitor 6（直接复用 Web 构建产物）
- **原生**：Kotlin 编写厂商专属插件
- **打包**：Gradle 8 + AGP 8

### 厂商适配清单

| 能力 | 小米 (MIUI) | OPPO (ColorOS) |
|---|---|---|
| 推送 | MiPush SDK | OPush SDK |
| 后台保活 | MIUI 自启动白名单提示 | ColorOS 电池优化引导 |
| 相册保存 | `MediaStore` + MIUI 相册标签 | `MediaStore` + ColorOS 私密相册兼容 |
| 暗色模式 | 跟随 MIUI 主题 | 跟随 ColorOS 主题 |
| 通知样式 | MIUI Channel 重要级别 | OPush Channel ID 必填 |

### 打包矩阵

```
mobile/android/app/build.gradle.kts
   ├── flavor: xiaomi   → applicationIdSuffix .xiaomi  + MiPush AppKey
   ├── flavor: oppo     → applicationIdSuffix .oppo    + OPush AppKey
   └── flavor: universal → 不集成厂商 SDK（FCM 留空）
```

## 六、安全

- API Key 加密存储（AES-GCM，密钥来自环境变量 `MASTER_KEY`）
- 后台管理强制密码登录（bcrypt）
- 所有出站请求统一通过服务端代理（不暴露 Key 到前端）
- 频率限制（per-IP + per-user）

## 七、可观测性

- 每次生成记录耗时、Token、成本
- 失败请求保留 request/response 快照供 LLM 复盘
- `/admin/observability` 仪表盘（后续）
