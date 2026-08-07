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
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject
    lateinit var store: SecureTokenStore

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                CoroutineScope(Dispatchers.IO).launch {
                    if (store.isPaired()) {
                        AgentForegroundService.start(context)
                    }
                }
            }
        }
    }
}
