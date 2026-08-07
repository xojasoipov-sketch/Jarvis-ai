package uz.jarvis.agent.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import uz.jarvis.agent.data.repository.AgentRepositoryImpl
import uz.jarvis.agent.ui.MainActivity
import uz.jarvis.agent.util.CommandExecutor
import javax.inject.Inject

@AndroidEntryPoint
class AgentForegroundService : Service() {

    @Inject lateinit var repo: AgentRepositoryImpl
    @Inject lateinit var executor: CommandExecutor

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        const val CHANNEL_ID = "jarvis_agent"
        const val NOTIF_ID = 1001
        const val ACTION_STOP = "uz.jarvis.agent.STOP"

        fun start(context: Context) {
            val intent = Intent(context, AgentForegroundService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, AgentForegroundService::class.java)
            intent.action = ACTION_STOP
            context.startService(intent)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification("Ulanmoqda..."))

        scope.launch { agentLoop() }

        return START_STICKY
    }

    private suspend fun agentLoop() {
        var heartbeatTick = 0

        while (true) {
            try {
                // Heartbeat every 30 cycles (~30s)
                heartbeatTick++
                if (heartbeatTick >= 30) {
                    heartbeatTick = 0
                    val ok = repo.heartbeat()
                    updateNotification(if (ok) "Faol — server bilan ulangan" else "Server bilan muammo")
                }

                // Poll & execute commands
                val commands = repo.pollCommands()
                for (cmd in commands) {
                    val result = executor.execute(cmd)
                    repo.postResult(cmd.id, result)
                }

                delay(1_000) // 1s poll interval
            } catch (e: CancellationException) {
                break
            } catch (_: Exception) {
                delay(5_000) // Back off on errors
            }
        }
    }

    private fun buildNotification(status: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = PendingIntent.getService(
            this, 1,
            Intent(this, AgentForegroundService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_send)
            .setContentTitle("Jarvis Agent")
            .setContentText(status)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "To'xtatish", stopIntent)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    private fun updateNotification(status: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(status))
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Jarvis Agent",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Fon rejimidagi Jarvis agent"
            setShowBadge(false)
        }

        // Commands notification channel
        val cmdChannel = NotificationChannel(
            "jarvis_commands",
            "Jarvis Buyruqlar",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Jarvis buyruqlaridan bildirishnomalar"
        }

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannels(listOf(channel, cmdChannel))
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * Foydalanuvchi ilovani recents (so'nggi ilovalar) ro'yxatidan surib tashlaganda
     * chaqiriladi. START_STICKY ko'p qurilmada yetarli, lekin Infinix (XOS), Xiaomi
     * (MIUI) kabi agressiv batareya boshqaruvchilar START_STICKY'ni e'tiborsiz
     * qoldirib xizmatni butunlay o'ldirishi mumkin — shuning uchun AlarmManager
     * orqali xizmatni bir necha soniyadan keyin majburan qayta ishga tushiramiz.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        val restartIntent = Intent(applicationContext, AgentForegroundService::class.java)
        val pendingIntent = PendingIntent.getService(
            applicationContext, 2, restartIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val am = applicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val triggerAt = SystemClock.elapsedRealtime() + 1_000
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (am.canScheduleExactAlarms()) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
            } else {
                am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
            }
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
