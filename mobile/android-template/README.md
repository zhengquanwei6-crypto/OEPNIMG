# android-template

此目录包含 **Gradle / 清单 模板片段**，用于在执行 `npx cap add android` 之后，
把自研插件、厂商分包配置 注入到自动生成的 `mobile/android/` 工程中。

Capacitor CLI 会重新生成 `android/` 中的部分文件，因此把这些定制项放在此处，
通过简单的脚本/手工拷贝同步过去，避免被覆盖。

## 文件用途

| 文件 | 作用 |
|---|---|
| `app/build.gradle` | 增加 `productFlavors`（xiaomi / oppo / universal），引入自研插件模块 |
| `settings.gradle` | 注册 `android-plugins/*` 为 Gradle 子工程 |
| `app/src/main/AndroidManifest-additions.xml` | 推送/相册/网络权限（合并到 `android/app/src/main/AndroidManifest.xml`） |

## 使用流程

```bash
cd mobile
npx cap add android        # 生成 android/

# 1) 把分包配置覆盖到 app/build.gradle（建议手工 diff 合并）
cp android-template/app/build.gradle android/app/build.gradle

# 2) 把自研插件模块注册追加到 settings.gradle
cat android-template/settings.gradle >> android/settings.gradle

# 3) 合并清单文件中的权限到 android/app/src/main/AndroidManifest.xml
#    （或在自研插件 AAR 内自带 manifest，build 时自动 merge）

pnpm sync:android
```

## 后续自动化（TODO）

可以把上述步骤封装成 `scripts/postinstall.sh`，让 `pnpm install` 后自动执行。
