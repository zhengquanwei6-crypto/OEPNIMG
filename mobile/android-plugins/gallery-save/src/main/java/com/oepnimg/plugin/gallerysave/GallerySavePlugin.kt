package com.oepnimg.plugin.gallerysave

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/**
 * GallerySave —— 把生成的图片保存到系统相册。
 *
 * 适配点：
 *  - Android 10+：MediaStore.Images（沙箱化 URI，无需 WRITE_EXTERNAL_STORAGE）
 *  - Android 9 及以下：写到 Pictures/OEPNIMG/，需要 WRITE_EXTERNAL_STORAGE
 *  - MIUI：保存后写入 RELATIVE_PATH 子目录 "OEPNIMG"，便于在小米相册以"相册分组"形式展示
 *  - ColorOS：默认 MediaStore 行为已可见于 OPPO 相册"截图"以外的相册分组
 *
 * 此实现为占位实现，TODO：
 *   1) 引入 OkHttp 替代 HttpURLConnection
 *   2) 增加进度回调
 *   3) 失败重试与离线缓存
 *   4) 写入 Exif（提示词 / Provider）
 */
@CapacitorPlugin(name = "OepnImgGallerySave")
class GallerySavePlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val ALBUM_NAME = "OEPNIMG"

    @PluginMethod
    fun saveFromUrl(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("缺少 url")
            return
        }
        val fileName = call.getString("fileName") ?: defaultFileName()
        val mime = call.getString("mimeType") ?: "image/png"

        scope.launch {
            try {
                val uri = withContext(Dispatchers.IO) { downloadAndInsert(url, fileName, mime) }
                val ret = JSObject().put("uri", uri)
                call.resolve(ret)
            } catch (e: Throwable) {
                call.reject(e.message ?: "保存失败", e)
            }
        }
    }

    private fun downloadAndInsert(url: String, fileName: String, mime: String): String {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
            put(MediaStore.MediaColumns.MIME_TYPE, mime)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH,
                    "${Environment.DIRECTORY_PICTURES}/$ALBUM_NAME")
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }
        val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val itemUri = resolver.insert(collection, values)
            ?: error("无法创建 MediaStore 条目")

        try {
            (URL(url).openConnection() as HttpURLConnection).run {
                connectTimeout = 15_000
                readTimeout = 30_000
                instanceFollowRedirects = true
                requestMethod = "GET"
                inputStream.use { input ->
                    resolver.openOutputStream(itemUri).use { output ->
                        if (output == null) error("无法打开输出流")
                        input.copyTo(output)
                    }
                }
                disconnect()
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val finalize = ContentValues().apply {
                    put(MediaStore.MediaColumns.IS_PENDING, 0)
                }
                resolver.update(itemUri, finalize, null, null)
            }
            return itemUri.toString()
        } catch (e: Throwable) {
            // 失败回滚
            runCatching { resolver.delete(itemUri, null, null) }
            throw e
        }
    }

    private fun defaultFileName(): String {
        val ts = System.currentTimeMillis()
        return "oepnimg_$ts.png"
    }
}
