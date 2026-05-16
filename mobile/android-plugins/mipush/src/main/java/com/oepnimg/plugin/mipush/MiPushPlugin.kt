package com.oepnimg.plugin.mipush

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * 小米推送插件 —— 占位实现。
 *
 * 接入步骤（提交真实 SDK 之前不会工作）：
 *   1. 把 MiPushSDK*.aar 放到 mobile/android-plugins/mipush/libs/
 *   2. 在 build.gradle 启用 implementation(name: 'MiPushSDK_xxx', ext: 'aar')
 *   3. 在 ~/.gradle/gradle.properties 配置：
 *        MIPUSH_APP_ID=2882303xxx
 *        MIPUSH_APP_KEY=5xxxxxxx
 *      （已通过 android-template/app/build.gradle 注入到 BuildConfig）
 *   4. 取消下方 MiPushClient 调用的 TODO 注释，并替换为对应代码：
 *        MiPushClient.registerPush(context, BuildConfig.MIPUSH_APP_ID, BuildConfig.MIPUSH_APP_KEY)
 *   5. 在主 App AndroidManifest（xiaomi flavor 专属源集）中声明 PushService 等组件
 *
 * JS 调用：
 *   ```ts
 *   import { registerPlugin } from "@capacitor/core";
 *   const MiPush = registerPlugin<MiPushPlugin>("OepnImgMiPush");
 *   await MiPush.register();
 *   const { regId } = await MiPush.getRegId();
 *   ```
 */
@CapacitorPlugin(name = "OepnImgMiPush")
class MiPushPlugin : Plugin() {

    @PluginMethod
    fun register(call: PluginCall) {
        // TODO: 接入正式 SDK 后调用 MiPushClient.registerPush(...)
        // val appId  = BuildConfig.MIPUSH_APP_ID
        // val appKey = BuildConfig.MIPUSH_APP_KEY
        // MiPushClient.registerPush(context.applicationContext, appId, appKey)

        val ret = JSObject()
            .put("registered", false)
            .put("reason", "MiPush SDK 未接入（占位实现）")
        call.resolve(ret)
    }

    @PluginMethod
    fun getRegId(call: PluginCall) {
        // TODO: val regId = MiPushClient.getRegId(context)
        val ret = JSObject().put("regId", null)
        call.resolve(ret)
    }

    @PluginMethod
    fun unregister(call: PluginCall) {
        // TODO: MiPushClient.unregisterPush(context)
        call.resolve()
    }

    @PluginMethod
    fun setAlias(call: PluginCall) {
        val alias = call.getString("alias")
        if (alias.isNullOrBlank()) {
            call.reject("缺少 alias")
            return
        }
        // TODO: MiPushClient.setAlias(context, alias, null)
        call.resolve()
    }
}
