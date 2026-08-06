package uz.jarvis.agent.util

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import uz.jarvis.agent.BuildConfig
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceInfo @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun deviceName(): String = "${Build.MANUFACTURER} ${Build.MODEL}"
    fun model(): String = Build.MODEL
    fun osVersion(): String = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
    fun appVersion(): String = BuildConfig.VERSION_NAME

    fun batteryLevel(): Int {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val intent = context.registerReceiver(null, filter) ?: return -1
        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        return if (level >= 0 && scale > 0) (level * 100 / scale) else -1
    }

    fun isCharging(): Boolean {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val intent = context.registerReceiver(null, filter) ?: return false
        val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        return status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL
    }

    fun freeDiskMb(): Long {
        val stat = android.os.StatFs(context.filesDir.path)
        return stat.availableBlocksLong * stat.blockSizeLong / (1024 * 1024)
    }

    fun totalDiskMb(): Long {
        val stat = android.os.StatFs(context.filesDir.path)
        return stat.blockCountLong * stat.blockSizeLong / (1024 * 1024)
    }

    fun uptimeSeconds(): Long = android.os.SystemClock.elapsedRealtime() / 1000
}
