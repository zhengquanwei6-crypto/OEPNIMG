package com.oepnimg.plugin.vendorhelper

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * VendorHelper —— 厂商专属的"系统设置跳板"。
 *
 * 用途：
 *   1) 检测当前设备厂商（小米 / OPPO / vivo / 华为 / 通用）
 *   2) 跳转自启动管理（保活）
 *   3) 跳转电池优化白名单
 *   4) 跳转通知权限页
 *
 * 各厂商系统的 Activity 名经常变更（甚至同厂商不同 ROM 版本都不同），
 * 所以采用 "尝试列表 + 失败回退到通用设置页" 的模式。
 *
 * 占位实现：覆盖小米 / OPPO 主流路径；其他厂商留空回退。
 */
@CapacitorPlugin(name = "OepnImgVendorHelper")
class VendorHelperPlugin : Plugin() {

    @PluginMethod
    fun detectVendor(call: PluginCall) {
        val brand = (Build.BRAND ?: "").lowercase()
        val manufacturer = (Build.MANUFACTURER ?: "").lowercase()
        val vendor = when {
            "xiaomi" in brand || "redmi" in brand || "xiaomi" in manufacturer -> "xiaomi"
            "oppo" in brand || "realme" in brand || "oneplus" in brand -> "oppo"
            "vivo" in brand -> "vivo"
            "huawei" in brand || "honor" in brand -> "huawei"
            else -> "generic"
        }
        val ret = JSObject()
            .put("vendor", vendor)
            .put("brand", Build.BRAND)
            .put("manufacturer", Build.MANUFACTURER)
            .put("model", Build.MODEL)
            .put("sdkInt", Build.VERSION.SDK_INT)
        call.resolve(ret)
    }

    @PluginMethod
    fun openAutoStartSettings(call: PluginCall) {
        val candidates = autoStartCandidates()
        if (!tryStart(candidates)) {
            // 回退：跳到应用详情页
            openAppDetails()
        }
        call.resolve()
    }

    @PluginMethod
    fun openBatteryOptimization(call: PluginCall) {
        val intent = Intent().apply {
            action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
            } else {
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            }
            data = Uri.parse("package:${context.packageName}")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        runCatching { context.startActivity(intent) }.onFailure { openAppDetails() }
        call.resolve()
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val intent = Intent().apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            } else {
                action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                data = Uri.parse("package:${context.packageName}")
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        runCatching { context.startActivity(intent) }.onFailure { openAppDetails() }
        call.resolve()
    }

    // -------- helpers --------

    private fun autoStartCandidates(): List<Pair<String, String>> = listOf(
        // 小米 / 红米
        "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
        // OPPO（不同 ColorOS 版本路径不同，按可能性排序）
        "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
        "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
        "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
        // vivo
        "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
        // 华为
        "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
        "com.huawei.systemmanager" to "com.huawei.systemmanager.optimize.process.ProtectActivity",
    )

    private fun tryStart(list: List<Pair<String, String>>): Boolean {
        for ((pkg, cls) in list) {
            val intent = Intent().apply {
                component = ComponentName(pkg, cls)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                context.startActivity(intent)
                return true
            } catch (_: Throwable) { /* try next */ }
        }
        return false
    }

    private fun openAppDetails() {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:${context.packageName}")
        ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        runCatching { context.startActivity(intent) }
    }
}
