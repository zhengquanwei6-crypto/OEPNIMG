#!/usr/bin/env bash
#
# OEPNIMG Android 工程自动化脚本
#
# 作用：在执行 `npx cap add android` 之后，把 mobile/android-template/ 中的
# 模板片段合并到自动生成的 mobile/android/，让自研插件 + 厂商分包配置生效。
#
# 用法：
#   bash mobile/scripts/setup-android.sh         # 执行注入
#   bash mobile/scripts/setup-android.sh --dry   # 仅打印计划
#
# 幂等：如检测到标记 "OEPNIMG-INJECTED" 已存在，则跳过对应步骤。
set -euo pipefail

DRY=0
[[ "${1:-}" == "--dry" ]] && DRY=1

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
TEMPLATE_DIR="$ROOT/android-template"
MARK="OEPNIMG-INJECTED"

if [[ ! -d "$ANDROID_DIR" ]]; then
  if [[ $DRY -eq 1 ]]; then
    echo "ℹ DRY 模式：尚未生成 $ANDROID_DIR（首次需运行 'npx cap add android'）"
    echo "  将要执行的步骤："
    echo "    1) 覆盖 app/build.gradle  ← $TEMPLATE_DIR/app/build.gradle"
    echo "    2) 追加 settings.gradle    ← $TEMPLATE_DIR/settings.gradle (自研插件子工程)"
    echo "    3) 合并 AndroidManifest    ← $TEMPLATE_DIR/app/src/main/AndroidManifest-additions.xml"
    echo "    4) 提示 web 构建状态"
    exit 0
  fi
  echo "✗ 未找到 $ANDROID_DIR"
  echo "  请先运行: cd mobile && npx cap add android"
  exit 1
fi

run() {
  echo "→ $*"
  if [[ $DRY -eq 0 ]]; then
    "$@"
  fi
}

# 1) 覆盖 app/build.gradle（启用 productFlavors + 自研插件依赖）
APP_GRADLE_DST="$ANDROID_DIR/app/build.gradle"
APP_GRADLE_SRC="$TEMPLATE_DIR/app/build.gradle"
if grep -q "$MARK" "$APP_GRADLE_DST" 2>/dev/null; then
  echo "✓ app/build.gradle 已注入，跳过"
else
  echo "→ 备份并覆盖 app/build.gradle"
  if [[ $DRY -eq 0 ]]; then
    cp -n "$APP_GRADLE_DST" "$APP_GRADLE_DST.bak.$(date +%s)" || true
    {
      echo "// $MARK $(date -u +%FT%TZ)"
      cat "$APP_GRADLE_SRC"
    } > "$APP_GRADLE_DST"
  fi
fi

# 2) settings.gradle 追加（注册自研插件子工程）
SETTINGS_DST="$ANDROID_DIR/settings.gradle"
SETTINGS_SRC="$TEMPLATE_DIR/settings.gradle"
if grep -q "$MARK" "$SETTINGS_DST" 2>/dev/null; then
  echo "✓ settings.gradle 已注入，跳过"
else
  echo "→ 追加 settings.gradle 自研插件注册"
  if [[ $DRY -eq 0 ]]; then
    {
      echo
      echo "// $MARK $(date -u +%FT%TZ) ---- 自研插件子工程"
      grep -E "^include\s+':oepnimg-" "$SETTINGS_SRC"
      grep -E "^project\(':oepnimg-" "$SETTINGS_SRC"
    } >> "$SETTINGS_DST"
  fi
fi

# 3) AndroidManifest.xml 权限合并（仅追加 uses-permission；标签去重交给 Manifest Merger）
MANIFEST_DST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
MANIFEST_ADD="$TEMPLATE_DIR/app/src/main/AndroidManifest-additions.xml"
if grep -q "$MARK" "$MANIFEST_DST" 2>/dev/null; then
  echo "✓ AndroidManifest.xml 已注入，跳过"
else
  echo "→ 合并 AndroidManifest 权限（提示：复杂合并请手工 diff）"
  if [[ $DRY -eq 0 ]]; then
    # 在 <manifest ...> 行后插入额外权限
    perl -i -pe '
      BEGIN { $perms = q{
    <!-- OEPNIMG-INJECTED: vendor SDK / gallery / push 所需权限 -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" tools:ignore="SelectedPhotoAccess" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
}; }
      if (!$done && /<manifest\b[^>]*>/) { $_ .= $perms; $done = 1 }
    ' "$MANIFEST_DST"
    # 注入 xmlns:tools 命名空间（若缺）
    if ! grep -q 'xmlns:tools=' "$MANIFEST_DST"; then
      perl -i -pe 's|(<manifest\s+xmlns:android="[^"]+")|$1 xmlns:tools="http://schemas.android.com/tools"|' "$MANIFEST_DST"
    fi
  fi
fi

# 4) 复制最新 web 构建（若存在）到 mobile/www/
WEB_OUT="$ROOT/../web/.next/standalone"
if [[ -d "$WEB_OUT" ]]; then
  echo "ℹ 检测到 web/.next/standalone 已构建（如需离线模式，请运行 next export）"
fi

echo "✓ 完成。下一步："
echo "  cd mobile && npx cap sync android"
echo "  npx cap open android  # 用 Android Studio 打开工程"
echo
echo "厂商分包构建："
echo "  ./gradlew assembleXiaomiRelease"
echo "  ./gradlew assembleOppoRelease"
echo "  ./gradlew assembleUniversalRelease"
