# OEPNIMG 快速上手

按本指南可在 10 分钟内跑通 web 端，再花 10 分钟生成第一份 Android APK。

---

## 0. 前置条件

| 工具 | 最低版本 | 说明 |
|---|---|---|
| Node.js | 20 LTS | 推荐 22 |
| pnpm | 9.x | `corepack enable && corepack prepare pnpm@9 --activate` |
| Android Studio | Hedgehog (2023.1+) | 仅 mobile 构建需要 |
| JDK | 17 | Android Gradle Plugin 8 要求 |

---

## 1. Web 端（5 分钟）

```bash
git clone https://github.com/zhengquanwei6-crypto/OEPNIMG.git
cd OEPNIMG

# 一次安装 web + mobile 两个工作区
pnpm install

# 配置环境变量
cd web
cp .env.example .env
# 至少修改 SESSION_SECRET 和 MASTER_KEY（任意 32 字符以上随机串）
# 若需启用 LLM 助手，再填 AGENT_API_KEY

# 数据库初始化
pnpm prisma:migrate     # 应用 migrations/init
pnpm db:seed            # 创建 admin 用户 + 默认 OpenAI 兼容模板

# 启动开发服务器
pnpm dev                # http://localhost:3000
```

默认登录：`admin / admin1234`

### 1.1 添加你的第一个 API 中转站

进入「后台」→「API 源」→「新建 API 源」：

| 字段 | 示例 |
|---|---|
| 名称 | 我的中转站 1号 |
| Slug | my-relay-1 |
| 模板 | OpenAI 兼容 v1 |
| Base URL | https://api.your-relay.com/v1 |
| API Key | sk-xxxxxxxx |

保存后到「生成」页选中该源 → 输入提示词 → 点生成。

### 1.2 用 LLM 助手解析新文档

进入「后台」→「LLM 助手」：

1. 粘贴中转站 API 文档 URL（或直接粘贴文档正文）
2. 点「开始解析」
3. 助手输出 JSON 后会自动保存为「草稿模板」
4. 到「适配器模板」→ 展开操作 → 输入 API Key 干跑校验
5. 干跑通过后点「发布为可用」
6. 回「API 源」用此模板创建 Provider

---

## 2. Android APK（10 分钟）

### 2.1 生成原生工程

```bash
cd mobile
pnpm install                   # 已在根目录 pnpm install 时完成

# 一键添加 Android 工程
npx cap add android

# 把 OEPNIMG 模板（productFlavors / 自研插件 / 权限）注入到刚生成的工程
bash scripts/setup-android.sh

# 同步 Capacitor 配置 + 复制 www/
pnpm sync:android
```

### 2.2 配置厂商 SDK（可选）

把厂商 SDK 的 AAR 放入对应 `libs/`：

```bash
# 小米推送
cp ~/Downloads/MiPush_SDK_Client_*.aar mobile/android-plugins/mipush/libs/

# OPPO 推送
cp ~/Downloads/com.heytap.msp-push-*.aar mobile/android-plugins/oppopush/libs/
```

并在 `~/.gradle/gradle.properties` 中配置 AppId/AppKey：

```properties
MIPUSH_APP_ID=2882303xxx
MIPUSH_APP_KEY=5xxxxxxxx
OPUSH_APP_KEY=xxxxx
OPUSH_APP_SECRET=xxxxx
```

### 2.3 构建 APK

```bash
cd mobile

# 通用版（不含厂商 SDK）
pnpm build:android:universal

# 小米版
pnpm build:android:xiaomi

# OPPO 版
pnpm build:android:oppo
```

输出位置：`mobile/android/app/build/outputs/apk/<flavor>/release/`

### 2.4 在线模式 vs 离线模式

编辑 `mobile/capacitor.config.ts`：

```ts
server: {
  // 取消注释 → 在线模式：APK 启动后直接打开线上站点
  // url: "https://your-oepnimg.example.com",
  androidScheme: "https",
}
```

- **在线模式**：发版无需重新打包；适合运营/快速迭代
- **离线模式**：注释 `server.url`，把 `next build && next export` 的产物放到 `mobile/www/`

---

## 3. 常用命令速查

```bash
# 根目录（pnpm workspace）
pnpm dev              # web 开发模式
pnpm build            # web 生产构建
pnpm verify           # typecheck + lint + build
pnpm verify:mobile    # 静态校验所有 Kotlin / Manifest / Gradle
pnpm db:migrate       # Prisma 迁移
pnpm db:seed          # 注入种子
pnpm db:studio        # 打开 Prisma Studio

# 移动端
pnpm mobile:setup     # 注入 OEPNIMG 模板到 android/
pnpm mobile:setup:dry # 预演（不修改文件）
pnpm mobile:sync      # cap sync android
```

---

## 4. 故障排查

### 启动报 `MASTER_KEY 未设置`
检查 `web/.env` 中的 `MASTER_KEY`，必须 ≥ 32 字符。

### 启动报 `SESSION_SECRET 必须配置且长度 ≥ 32`
同上，修改 `SESSION_SECRET`。

### LLM 助手报 `未配置 AGENT_API_KEY`
这是预期的 —— 你需要填入任意 OpenAI 兼容中转站的 Key 才能让助手工作。
（自举：助手本身也走中转站，验证多源能力）

### Prisma `P3009 migration already applied`
正常的，说明数据库已是最新版本。`pnpm db:seed` 是幂等的，可重复运行。

### Android 构建报 `MiPush SDK not found`
你尚未把 AAR 放到 `mobile/android-plugins/mipush/libs/`。
若不需要小米推送，可改用 `assembleUniversalRelease`。
