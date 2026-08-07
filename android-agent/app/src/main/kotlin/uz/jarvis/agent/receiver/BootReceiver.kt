package uz.jarvis.agent.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import uz.jarvis.agent.data.storage.SecureTokenStore
import uz.jarvis.agent.service.AgentForegroundService
import uz.jarvis.agent.worker.KeepAliveWorker
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    companion object {
        /** AgentForegroundService.onTaskRemoved shu action bilan AlarmManager orqali yuboradi. */
        const val ACTION_RESTART_AGENT = "uz.jarvis.agent.RESTART_AGENT"
    }

    @Inject
    lateinit var store: SecureTokenStore

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            ACTION_RESTART_AGENT -> {
                // BroadcastReceiver'dan xizmatni qayta ishga tushirish — bu Android'ning
                // "fondan foreground xizmat ishga tushirish" cheklovidan chiqadigan,
                // rasman qo'llab-quvvatlanadigan yo'l (PendingIntent.getService orqali
                // to'g'ridan-to'g'ri Service'ni nishonlashdan ko'ra ancha ishonchli —
                // ayniqsa jarayon butunlay o'ldirilgan bo'lsa).
                CoroutineScope(Dispatchers.IO).launch {
                    if (store.isPaired()) {
                        AgentForegroundService.start(context)
                        KeepAliveWorker.enqueue(context)
                    }
                }
            }
        }
    }
}
