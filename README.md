# OEPNIMG

> 统一的 AI 图片生成平台 —— 一处接入，多源切换

OEPNIMG 是一个面向多 API 中转站的图片生成聚合平台，提供 **网页端** 与 **Android APK**（针对小米 MIUI / OPPO ColorOS 做底层适配）。后台内嵌 **LLM 助手**，可根据中转站 API 文档自动生成新的 API 适配器，实现"上传文档 → 即刻可用"。

---

## 功能特性

### 多源适配（核心）
- 通过统一的 `Adapter` 抽象封装任意 OpenAI / Midjourney / Stable Diffusion 中转站
- 适配器版本化：同一中转站可保留多个文档版本
- 一键切换 API 源，前端调用方式完全一致

### LLM 文档助手
- 输入 API 文档链接 → 自动抓取
- 解析文档结构（端点、鉴权、请求体、响应体）
- 自动生成 Adapter JSON 配置
- 人工微调后保存为新源

### 图片生成
- 文生图 / 图生图 / 高清放大 / 局部重绘
- 支持任务队列与异步轮询
- 历史记录、收藏、批量下载

### 移动端
- Capacitor 复用 Web 资产
- 小米：MiPush 推送 + MIUI 相册保存
- OPPO：OPush 推送 + ColorOS 权限处理
- 暗色模式跟随系统

---

## 项目结构

```
OEPNIMG/
├── web/                  # Next.js 14 全栈（PC / 移动 H5）
├── mobile/               # Capacitor + Android 原生壳
├── docs/                 # 架构与适配器规范文档
└── README.md
```

详见 [`docs/architecture.md`](./docs/architecture.md)。

---

## 快速开始

### Web 端

```bash
cd web
pnpm install
cp .env.example .env       # 配置数据库与 LLM 中转站
pnpm prisma migrate dev
pnpm dev                   # http://localhost:3000
```

### Android 端

```bash
cd mobile
pnpm install
pnpm cap sync android
pnpm cap open android      # 在 Android Studio 中构建 APK
```

---

## 技术栈

| 层 | 技术 |
|---|---|
| Web 框架 | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Radix |
| 数据层 | Prisma + SQLite (dev) / PostgreSQL (prod) |
| LLM | 任意 OpenAI 兼容中转站（自举） |
| 移动端 | Capacitor 6 + Kotlin 原生插件 |
| 推送 | MiPush SDK / OPush SDK |

---

## 路线图

- [x] 项目骨架
- [ ] Adapter 执行器
- [ ] LLM 文档解析 Agent
- [ ] Web 后台管理
- [ ] Android 壳工程 + 原生模块
- [ ] 任务队列（BullMQ）
- [ ] 用户系统（多租户）
- [ ] Docker 部署模板
