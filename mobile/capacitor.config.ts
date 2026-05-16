import type { CapacitorConfig } from "@capacitor/cli";

/**
 * OEPNIMG 移动端 Capacitor 配置
 *
 * 部署模式：
 *   1. 远程模式（默认）：APK 直接加载在线 OEPNIMG 网站（推荐，零打包成本）
 *   2. 本地模式：将 web/ 构建产物拷贝到 webDir，APK 内置全部静态资源
 *
 * 切换方式：注释/反注释下方 server.url。
 */
const config: CapacitorConfig = {
  appId: "com.oepnimg.app",
  appName: "OEPNIMG",
  webDir: "www",
  bundledWebRuntime: false,

  server: {
    // 在线模式 —— 把 url 指向你的部署域名
    // url: "https://your-oepnimg.example.com",
    androidScheme: "https",
    cleartext: false,
    allowNavigation: ["*.oepnimg.com", "your-oepnimg.example.com"],
  },

  android: {
    buildOptions: {
      releaseType: "APK",
      // 签名信息从 ~/.gradle/gradle.properties 或环境变量读取
    },
    // 允许使用混合协议；中转站返回的图片可能含 http:// 历史链接
    allowMixedContent: false,
    // backgroundColor: 启动闪屏底色
    backgroundColor: "#0b0f1a",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#0b0f1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0f1a",
    },
  },
};

export default config;
