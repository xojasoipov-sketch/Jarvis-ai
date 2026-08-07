package uz.jarvis.agent.util

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
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

@Singleton
class CommandExecutor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val deviceInfo: DeviceInfo,
) {
    // Whitelisted commands (must match server whitelist)
    private val whitelist = setOf(
        "device_status", "battery_status", "storage_status",
        "get_location", "take_screenshot", "send_notification",
        "vibrate", "open_camera", "get_files",
        "upload_file", "download_file", "terminal_command",
        "voice_record", "clipboard_sync",
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
                    "get_location" -> getLocation()
                    "send_notification" -> sendNotification(cmd.params)
                    "vibrate" -> vibrate(cmd.params)
                    "get_files" -> getFiles(cmd.params)
                    "download_file" -> downloadFile(cmd.params)
                    "terminal_command" -> terminalCommand(cmd.params)
                    "clipboard_sync" -> clipboardSync()
                    else -> CommandResult.Ok("Buyruq qabul qilindi: ${cmd.command}")
                }
            }.getOrElse { e ->
                CommandResult.Err("Xato: ${e.message}")
            }
        }
    }

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

    private fun getLocation(): CommandResult {
        val pm = context.packageManager
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

    private fun terminalCommand(params: Map<String, String>): CommandResult {
        val cmd = params["cmd"] ?: return CommandResult.Err("cmd parametri kerak")

        // Safety: block dangerous commands
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

    private fun clipboardSync(): CommandResult {
        // Returns current clipboard text (read-only from service thread is not allowed in Android 10+)
        return CommandResult.Ok("Clipboard sync faqat UI threaddan ishlaydi")
    }
}
