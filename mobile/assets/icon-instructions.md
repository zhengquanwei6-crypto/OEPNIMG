# 应用图标占位说明

OEPNIMG 当前使用 Capacitor 默认图标。生产前请替换：

## 推荐方式：使用 `@capacitor/assets`

```bash
cd mobile
pnpm add -D @capacitor/assets

# 准备一张 1024x1024 的 PNG → mobile/assets/icon.png
# 准备一张 2732x2732 的 PNG → mobile/assets/splash.png（启动图）

npx capacitor-assets generate --android
```

工具会自动生成所有 mipmap-*dpi、adaptive-icon、splash 资源。

## 手工替换路径

如果不想用工具，可直接覆盖：

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png         48x48
├── mipmap-hdpi/ic_launcher.png         72x72
├── mipmap-xhdpi/ic_launcher.png        96x96
├── mipmap-xxhdpi/ic_launcher.png       144x144
├── mipmap-xxxhdpi/ic_launcher.png      192x192
└── mipmap-anydpi-v26/
    ├── ic_launcher.xml                 自适应图标 layer-list
    └── ic_launcher_round.xml
```

启动图：

```
android/app/src/main/res/drawable/splash.png   2732x2732
```

## 厂商商店要求

| 平台 | 图标尺寸 | 文件 |
|---|---|---|
| 小米开放平台 | 512×512 PNG | 应用资料填写 |
| OPPO 开放平台 | 216×216 PNG | 应用资料填写 |
| Google Play | 512×512 PNG | Play Console |

应用内图标和商店图标可以使用同一张 1024×1024 的源图缩放。
