package com.oepnimg.plugin.oppopush

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * OPPO 推送（Heytap MSP）插件 —— 占位实现。
 *
 * 接入步骤：
 *   1. 把 com.heytap.msp:push 的 AAR 放到 mobile/android-plugins/oppopush/libs/
 *   2. 在 build.gradle 启用对应 implementation 行
 *   3. 在 ~/.gradle/gradle.properties 配置：
 *        OPUSH_APP_KEY=xxx
 *        OPUSH_APP_SECRET=xxx
 *      （已通过 android-template/app/build.gradle 注入到 BuildConfig）
 *   4. 替换下方 TODO 为：
 *        HeytapPushManager.init(context, true)
 *        HeytapPushManager.register(context, BuildConfig.OPUSH_APP_KEY, BuildConfig.OPUSH_APP_SECRET, callback)
 *   5. 在 oppo flavor 源集的 AndroidManifest 中声明 DataMessageReceiver 等组件
 *
 * JS 调用：
 *   ```ts
 *   import { registerPlugin } from "@capacitor/core";
 *   const OppoPush = registerPlugin<OppoPushPlugin>("OepnImgOppoPush");
 *   await OppoPush.register();
 *   const { regId } = await OppoPush.getRegId();
 *   ```
 */
@CapacitorPlugin(name = "OepnImgOppoPush")
class OppoPushPlugin : Plugin() {

    @PluginMethod
    fun register(call: PluginCall) {
        // TODO: 接入 HeytapPushManager
        // HeytapPushManager.init(context.applicationContext, true)
        // HeytapPushManager.register(context.applicationContext,
        //     BuildConfig.OPUSH_APP_KEY, BuildConfig.OPUSH_APP_SECRET, mCallback)

        val ret = JSObject()
            .put("registered", false)
            .put("reason", "OPush SDK 未接入（占位实现）")
        call.resolve(ret)
    }

    @PluginMethod
    fun getRegId(call: PluginCall) {
        // TODO: HeytapPushManager.getRegister()  // 异步 callback；占位返回 null
        val ret = JSObject().put("regId", null)
        call.resolve(ret)
    }

    @PluginMethod
    fun unregister(call: PluginCall) {
        // TODO: HeytapPushManager.unRegister()
        call.resolve()
    }

    @PluginMethod
    fun isSupported(call: PluginCall) {
        // TODO: val supported = HeytapPushManager.isSupportPush(context)
        val ret = JSObject().put("supported", false)
        call.resolve(ret)
    }
}
