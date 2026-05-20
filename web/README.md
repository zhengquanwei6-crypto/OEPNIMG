# OEPNIMG Web

多源 AI 图片生成平台 —— ChatGPT 风格对话界面 + 全功能管理后台。

## 功能概览

### 前台（对话式 UI）
- 💬 聊天 + 画图混合对话
- 🖼 多 Provider / 多模型图片生成
- 📱 响应式（桌面 + 移动端）
- 🌗 亮色 / 暗色 / 跟随系统

### 后台（Admin）
- 📡 API 源管理（Provider CRUD + 连通测试）
- 📄 适配器模板（LLM 自动生成 + 编辑器 + 干跑）
- ⚙️ 系统设置（网页修改，立即生效，无需重启）
- 👤 用户管理（改密码/改用户名）
- 📋 审计日志（所有操作留痕）
- 📊 生成历史（跨用户搜索）

### 安全
- 登录限流（5次/15分钟/IP）
- Edge Middleware 路由保护
- HTTP 安全响应头（CSP 相关 7 项）
- 图片生成强制登录
- 全部管理操作审计

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router, standalone) |
| UI | Tailwind CSS + Radix UI + shadcn 风格 |
| ORM | Prisma + SQLite (可切 PostgreSQL) |
| 认证 | iron-session + bcryptjs |
| 部署 | Docker (Alpine) |

## 快速开始

```bash
# 开发
cd web
cp .env.example .env   # 编辑必要配置
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev

# Docker 部署
cp .env.example .env   # 编辑
docker compose up -d --build
```

## 路由结构

```
/login                  独立登录页
/(app)/chat             对话（画图 + 聊天）
/(app)/generate         传统生成页
/(app)/admin            管理后台概览
/(app)/admin/providers  API 源管理
/(app)/admin/templates  适配器模板
/(app)/admin/agent      LLM 助手
/(app)/admin/history    生成历史
/(app)/admin/users      用户管理
/(app)/admin/settings   系统设置
/(app)/admin/audit      审计日志
```

## API 端点

| 方法 | 路由 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（含 DB 探活）|
| POST | `/api/auth/login` | 登录（5次/15分限流）|
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/me` | 当前用户 |
| GET/POST | `/api/conversations` | 对话列表/创建 |
| GET/PATCH/DELETE | `/api/conversations/:id` | 对话详情/更新/删除 |
| GET/POST | `/api/conversations/:id/messages` | 消息 |
| POST | `/api/generate` | 图片生成（需登录）|
| GET/POST | `/api/providers` | Provider 列表/创建 |
| GET/PUT | `/api/admin/settings` | 系统设置 |
| PUT | `/api/admin/password` | 修改密码 |
| GET/PUT | `/api/admin/users` | 用户管理 |
| GET | `/api/admin/audit` | 审计日志 |

## 环境变量

所有运行时配置都可以通过 **后台 > 系统设置** 在网页中修改（无需改 .env / 重启）：

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DATABASE_URL` | 数据库连接 | `file:./dev.db` |
| `SESSION_SECRET` | Cookie 加密密钥（≥32字符）| — |
| `MASTER_KEY` | API Key 字段加密密钥 | — |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员初始密码 | `admin1234` |
| `AGENT_BASE_URL` | LLM 助手 API 地址 | `https://api.openai.com/v1` |
| `AGENT_API_KEY` | LLM 助手 API Key | — |
| `AGENT_MODEL` | LLM 使用的模型 | `gpt-4o-mini` |
| `COOKIE_SECURE` | Cookie Secure 属性 | `true` |

## 数据模型

```
User ─┬─ Generation (图片生成记录)
      │
Conversation ─── Message (对话+消息)
      │
Provider ─── Model (API 源+模型)
      │
AdapterTemplate (适配器模板)
      │
AppSetting (运行时配置)
AuditLog (审计日志)
```
