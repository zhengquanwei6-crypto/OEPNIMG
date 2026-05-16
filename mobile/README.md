# OEPNIMG · Mobile (Android)

Capacitor 6 壳工程。复用 `../web` 的 Next.js 构建产物，针对 **小米 / OPPO** 做底层 SDK 适配（推送、相册保存、权限引导）。

## 目录

```
mobile/
├── capacitor.config.ts        # Capacitor 配置（远程模式 vs 本地模式）
├── package.json               # 依赖与脚本
├── www/                       # web 构建产物拷贝目标（gitignore，运行 sync 时生成）
├── android/                   # 原生 Android 工程（首次运行 `cap add android` 生成）
└── android-plugins/           # 自研原生插件源码（build 时被 settings.gradle 引用）
    ├── mipush/                # 小米推送
    ├── oppopush/              # OPPO 推送
    ├── gallery-save/          # 保存到相册（适配 MIUI/ColorOS）
    └── vendor-helper/         # 厂商电池/通知权限引导
```

## 首次初始化（在工作区）

```bash
cd mobile
pnpm install
# 1. 拷贝 web 构建到 www（远程模式可跳过；建议先做一份基础 index.html）
mkdir -p www && cp public/index.html www/

# 2. 生成 Android 工程
npx cap add android

# 3. 同步配置 + 安装插件
pnpm sync:android

# 4. 打开 Android Studio
pnpm open:android
```

## 多渠道（厂商）打包

`android/app/build.gradle` 中预设三个 productFlavors：

| flavor | applicationId 后缀 | 集成 |
|---|---|---|
| `xiaomi` | `.xiaomi` | MiPush + MIUI 适配 |
| `oppo` | `.oppo` | OPush + ColorOS 适配 |
| `universal` | （无） | 不集成厂商 SDK |

```bash
pnpm build:android:xiaomi      # 输出 app-xiaomi-release.apk
pnpm build:android:oppo        # 输出 app-oppo-release.apk
pnpm build:android:universal
```

## 在线 vs 离线模式

`capacitor.config.ts` 中：

- **在线模式**：取消 `server.url` 注释，APK 启动后直接打开线上站点。优势：发版无需重新打包，立即生效。
- **离线模式**：注释 `server.url`，将 `next build && next export` 的产物放到 `mobile/www/`。优势：弱网可用、首屏更快。

## 厂商适配清单

| 能力 | 小米 (MIUI) | OPPO (ColorOS) |
|---|---|---|
| 推送 | MiPush SDK | OPush SDK |
| 后台保活 | 自启动白名单引导 | 电池优化白名单引导 |
| 相册保存 | MediaStore + MIUI 相册组 | MediaStore + 私密相册兼容 |
| 通知 Channel | 必须设置 importance | 必须设置 oppo channel id |
| 暗色模式 | 跟随 MIUI 主题 | 跟随 ColorOS 主题 |
| 权限引导 | `intent#com.miui.securitycenter` | `intent#com.coloros.safecenter` |

具体实现见 `android-plugins/*` 与 `android/app/src/{xiaomi,oppo}/`。
