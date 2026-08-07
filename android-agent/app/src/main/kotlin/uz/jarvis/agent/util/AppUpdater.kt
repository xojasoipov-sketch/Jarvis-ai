package uz.jarvis.agent.util

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.FileProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import uz.jarvis.agent.BuildConfig
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Ilovaning o'zini yangilashi — serverdan eng so'nggi versiyani so'raydi, joriy
 * versionCode'dan kattaroq bo'lsa APK'ni yuklab olib, tizim o'rnatuvchisini ochadi.
 *
 * MUHIM: Android xavfsizlik qoidasiga ko'ra oddiy ilova o'zini FONDA, foydalanuvchi
 * tasdiqlashisiz o'rnata olmaydi — o'rnatish oynasida bir marta "O'rnatish" bosiladi.
 * Shu bosishdan boshqa hech narsa qo'lda qilinmaydi (APK qidirish/yuklab olish yo'q).
 */
@Singleton
class AppUpdater @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val http = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)  // APK ~30MB
        .build()

    data class UpdateInfo(val versionCode: Int, val versionName: String, val url: String)

    /** Serverdagi eng so'nggi versiyani so'raydi. Yangisi bo'lmasa null. */
    suspend fun check(serverUrl: String): UpdateInfo? = withContext(Dispatchers.IO) {
        try {
            val base = serverUrl.trimEnd('/')
            val req = Request.Builder().url("$base/api/devices/apk/latest").build()
            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return@withContext null
                val body = resp.body?.string() ?: return@withContext null
                val obj = json.parseToJsonElement(body).jsonObject
                val versionCode = obj["version_code"]?.jsonPrimitive?.content?.toIntOrNull()
                    ?: return@withContext null
                val url = obj["download_url"]?.jsonPrimitive?.content ?: return@withContext null
                val versionName = obj["version_name"]?.jsonPrimitive?.content ?: "$versionCode"
                if (versionCode <= BuildConfig.VERSION_CODE) return@withContext null
                UpdateInfo(versionCode, versionName, url)
            }
        } catch (_: Exception) {
            null
        }
    }

    /** APK'ni yuklab olib, tizim o'rnatuvchisini ochadi. Muvaffaqiyat holatini qaytaradi. */
    suspend fun downloadAndInstall(info: UpdateInfo): Result<String> = withContext(Dispatchers.IO) {
        try {
            if (!canInstall()) {
                return@withContext Result.failure(
                    IllegalStateException(
                        "\"Noma'lum manbalardan o'rnatish\" ruxsati yo'q. " +
                        "Sozlamalar → Ilovalar → Jarvis Agent → Noma'lum ilovalarni o'rnatish → Yoqing."
                    )
                )
            }

            val dir = File(context.cacheDir, "updates").apply { mkdirs() }
            // Eski yuklamalarni tozalaymiz — kesh to'lib ketmasin
            dir.listFiles()?.forEach { it.delete() }
            val apk = File(dir, "jarvis-agent-${info.versionCode}.apk")

            val req = Request.Builder().url(info.url).build()
            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) {
                    return@withContext Result.failure(Exception("Yuklab olinmadi: HTTP ${resp.code}"))
                }
                val bytes = resp.body?.byteStream() ?: return@withContext Result.failure(Exception("Bo'sh javob"))
                apk.outputStream().use { out -> bytes.copyTo(out) }
            }

            if (apk.length() < 1_000_000) {
                apk.delete()
                return@withContext Result.failure(Exception("APK juda kichik — yuklash to'liq emas"))
            }

            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(intent)

            Result.success(
                "v${info.versionName} yuklab olindi. Telefon ekranida \"O'rnatish\" tugmasini bosing."
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Ilova APK o'rnatishga ruxsatli ekanini tekshiradi (Android 8+). */
    private fun canInstall(): Boolean =
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else true

    /** "Noma'lum manbalar" ruxsati sahifasini ochadi. */
    fun openInstallPermissionSettings(): Boolean = try {
        val intent = Intent(
            android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            android.net.Uri.parse("package:${context.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
    } catch (_: Exception) {
        false
    }

    @Suppress("unused")
    private fun installedVersion(): Int = try {
        context.packageManager.getPackageInfo(context.packageName, 0).let {
            @Suppress("DEPRECATION") it.versionCode
        }
    } catch (_: PackageManager.NameNotFoundException) {
        BuildConfig.VERSION_CODE
    }
}
