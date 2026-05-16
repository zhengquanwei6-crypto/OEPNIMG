/**
 * Web 侧调用原生插件的统一入口。
 * 在 web 项目中通过 import 复用此文件（path: mobile/src/native.ts）。
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

// ---------- 类型 ----------
export interface GallerySavePlugin {
  saveFromUrl(opts: {
    url: string;
    fileName?: string;
    mimeType?: string;
  }): Promise<{ uri: string }>;
}

export type Vendor = "xiaomi" | "oppo" | "vivo" | "huawei" | "generic";

export interface VendorHelperPlugin {
  detectVendor(): Promise<{
    vendor: Vendor;
    brand: string;
    manufacturer: string;
    model: string;
    sdkInt: number;
  }>;
  openAutoStartSettings(): Promise<void>;
  openBatteryOptimization(): Promise<void>;
  openNotificationSettings(): Promise<void>;
}

export interface PushPlugin {
  register(): Promise<{ registered: boolean; reason?: string }>;
  getRegId(): Promise<{ regId: string | null }>;
  unregister(): Promise<void>;
}

// ---------- 实例 ----------
export const GallerySave =
  registerPlugin<GallerySavePlugin>("OepnImgGallerySave");
export const VendorHelper =
  registerPlugin<VendorHelperPlugin>("OepnImgVendorHelper");
export const MiPush = registerPlugin<PushPlugin>("OepnImgMiPush");
export const OppoPush = registerPlugin<PushPlugin>("OepnImgOppoPush");

// ---------- 高级封装 ----------
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // "web" | "android" | "ios"

/** 保存图片到相册；Web 端回退为浏览器下载 */
export async function savePictureToGallery(url: string, fileName?: string) {
  if (!isNative) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ?? "oepnimg.png";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { uri: url };
  }
  return GallerySave.saveFromUrl({ url, fileName });
}

/** 按厂商自动注册推送；Web/未识别厂商直接跳过 */
export async function registerPushByVendor() {
  if (!isNative) return { vendor: "generic" as Vendor, registered: false };
  const { vendor } = await VendorHelper.detectVendor();
  if (vendor === "xiaomi") {
    const r = await MiPush.register();
    return { vendor, ...r };
  }
  if (vendor === "oppo") {
    const r = await OppoPush.register();
    return { vendor, ...r };
  }
  return { vendor, registered: false, reason: "未识别的厂商，跳过厂商推送" };
}
