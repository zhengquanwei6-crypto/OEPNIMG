# Android 签名密钥管理

## 1. 生成密钥库（首次）

```bash
# 在仓库外（如 ~/keystores/）生成，永远不要提交到 git
keytool -genkey -v \
  -keystore ~/keystores/oepnimg-release.jks \
  -keyalg RSA -keysize 4096 -validity 25000 \
  -alias oepnimg
```

请妥善备份该 `.jks` 文件 + 密码 + alias —— **丢失后所有渠道都无法继续升级现有用户的 APK**（应用市场要求新版本必须使用同一签名）。

## 2. 配置签名（本地构建）

在 **`~/.gradle/gradle.properties`**（用户级，不入仓库）中：

```properties
OEPNIMG_KEYSTORE_PATH=/Users/you/keystores/oepnimg-release.jks
OEPNIMG_KEYSTORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
OEPNIMG_KEY_ALIAS=oepnimg
OEPNIMG_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

然后在 `mobile/android/app/build.gradle` 的 `android { ... }` 块内添加（自动化脚本未做这一步，避免覆盖用户已有签名配置）：

```groovy
signingConfigs {
    release {
        storeFile     file(project.findProperty('OEPNIMG_KEYSTORE_PATH') ?: 'placeholder.jks')
        storePassword project.findProperty('OEPNIMG_KEYSTORE_PASSWORD') ?: ''
        keyAlias      project.findProperty('OEPNIMG_KEY_ALIAS')         ?: ''
        keyPassword   project.findProperty('OEPNIMG_KEY_PASSWORD')      ?: ''
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...
    }
}
```

## 3. CI 签名（GitHub Actions）

将密钥以 base64 形式存入 GitHub Secrets：

```bash
base64 -i ~/keystores/oepnimg-release.jks | pbcopy   # macOS
base64 ~/keystores/oepnimg-release.jks | xclip       # Linux
```

`Settings → Secrets and variables → Actions`：

| Secret 名 | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | 上面 base64 的输出 |
| `ANDROID_KEYSTORE_PASSWORD` | 密钥库密码 |
| `ANDROID_KEY_ALIAS` | `oepnimg` |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

CI 工作流示例（`.github/workflows/release.yml`）：

```yaml
- name: 解码 keystore
  run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > $RUNNER_TEMP/keystore.jks
- name: Build signed APK
  env:
    OEPNIMG_KEYSTORE_PATH: ${{ runner.temp }}/keystore.jks
    OEPNIMG_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    OEPNIMG_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    OEPNIMG_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  working-directory: mobile/android
  run: ./gradlew assembleXiaomiRelease assembleOppoRelease assembleUniversalRelease
```

## 4. 校验签名

```bash
# 查看 APK 签名信息
$ANDROID_HOME/build-tools/34.0.0/apksigner verify -v --print-certs app-xiaomi-release.apk

# 使用 keytool 查看密钥库内的指纹
keytool -list -v -keystore ~/keystores/oepnimg-release.jks -alias oepnimg
```

## 5. 重要提示

- **不要把 `.jks` / `.keystore` / 密码** 提交到任何 git 仓库
- 已在 `.gitignore` 中排除 `*.keystore`、`*.jks`
- 多个开发者协作时，把密钥库放在共享密码管理器（1Password / Bitwarden）中
- 每个厂商（小米/OPPO 应用商店）首次上传时使用的就是这把签名 —— 后续升级必须保持一致
