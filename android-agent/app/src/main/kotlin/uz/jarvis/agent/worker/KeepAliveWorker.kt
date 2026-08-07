package uz.jarvis.agent.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import uz.jarvis.agent.data.storage.SecureTokenStore
import uz.jarvis.agent.service.AgentForegroundService
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker — xizmatni 15 daqiqada bir majburan tekshirib ishga tushiradi.
 * Infinix XOS / Xiaomi MIUI / Samsung One UI kabi OEM batareya killerlari
 * START_STICKY va AlarmManager'ni e'tiborsiz qoldirsa ham WorkManager ulardan
 * ko'ra bardoshli (expedited work request sifatida).
 */
@HiltWorker
class KeepAliveWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val store: SecureTokenStore,
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        if (store.isPaired()) {
            AgentForegroundService.start(applicationContext)
        }
        // Re-enqueue next run (WorkManager minimum is 15 min)
        enqueue(applicationContext)
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "jarvis_keep_alive"

        fun enqueue(context: Context) {
            val request = PeriodicWorkRequestBuilder<KeepAliveWorker>(15, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.LINEAR, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        /** Bir martalik tezkor yuklash — xizmat to'xtab qolsa darhol qayta ishga tushirish. */
        fun enqueueOneShot(context: Context) {
            val request = OneTimeWorkRequestBuilder<KeepAliveWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
