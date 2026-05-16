# OEPNIMG · Android 自研插件

为 OEPNIMG 提供原生能力的 Capacitor 插件集合。每个插件是一个独立的 Gradle 子工程，
通过 `mobile/android-template/settings.gradle` 注册到主工程。

## 插件清单

| 插件 | Capacitor Plugin ID | JS 调用 |
|---|---|---|
| `gallery-save` | `OepnImgGallerySave` | `await GallerySave.saveFromUrl({ url })` |
| `vendor-helper` | `OepnImgVendorHelper` | `await VendorHelper.detectVendor()` / `openAutoStartSettings()` |
| `mipush` | `OepnImgMiPush` | `await MiPush.register()` —— 仅 xiaomi flavor |
| `oppopush` | `OepnImgOppoPush` | `await OppoPush.register()` —— 仅 oppo flavor |

## 通用接入方式

```typescript
// web/src/lib/native.ts
import { registerPlugin, Capacitor } from "@capacitor/core";
import type { GallerySavePlugin } from "@oepnimg/gallery-save";

export const GallerySave = registerPlugin<GallerySavePlugin>("OepnImgGallerySave");
export const isNative = Capacitor.isNativePlatform();

export async function savePicture(url: string) {
  if (!isNative) {
    // Web 端走浏览器下载
    window.open(url, "_blank");
    return;
  }
  await GallerySave.saveFromUrl({ url });
}
```

## 占位实现说明

当前各插件仅包含 **Manifest + Kotlin 入口类 + Gradle 模块**，业务逻辑标记为
`TODO`。集成方在配置好厂商 SDK（AppId / AppKey）后，按 README 内的步骤填充。

集成 SDK：
1. 把 `MiPushSDK*.aar` 放到 `mipush/libs/`
2. 把 `OPushSDK*.aar` 放到 `oppopush/libs/`
3. 在 `~/.gradle/gradle.properties` 配置 AppId / AppKey
4. 重新构建对应 flavor 的 APK

## 测试命令

```bash
cd mobile/android
./gradlew :oepnimg-gallery-save:assembleRelease
./gradlew :oepnimg-mipush:assembleRelease
./gradlew :oepnimg-oppopush:assembleRelease
./gradlew :oepnimg-vendor-helper:assembleRelease
```
