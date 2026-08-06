package uz.jarvis.agent.data.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "jarvis_secure")

@Singleton
class SecureTokenStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        val KEY_DEVICE_TOKEN = stringPreferencesKey("device_token")
        val KEY_SERVER_URL = stringPreferencesKey("server_url")
        val KEY_DEVICE_NAME = stringPreferencesKey("device_name")
        val KEY_PAIRED_AT = longPreferencesKey("paired_at")
    }

    val deviceId: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_ID] }
    val deviceToken: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_TOKEN] }
    val serverUrl: Flow<String?> = context.dataStore.data.map { it[KEY_SERVER_URL] }
    val deviceName: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_NAME] }
    val pairedAt: Flow<Long?> = context.dataStore.data.map { it[KEY_PAIRED_AT] }

    suspend fun isPaired(): Boolean {
        val token = context.dataStore.data.first()[KEY_DEVICE_TOKEN]
        return !token.isNullOrBlank()
    }

    suspend fun saveSession(
        deviceId: String,
        deviceToken: String,
        serverUrl: String,
        deviceName: String,
    ) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DEVICE_ID] = deviceId
            prefs[KEY_DEVICE_TOKEN] = deviceToken
            prefs[KEY_SERVER_URL] = serverUrl
            prefs[KEY_DEVICE_NAME] = deviceName
            prefs[KEY_PAIRED_AT] = System.currentTimeMillis()
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.remove(KEY_DEVICE_ID)
            prefs.remove(KEY_DEVICE_TOKEN)
            prefs.remove(KEY_SERVER_URL)
            prefs.remove(KEY_DEVICE_NAME)
            prefs.remove(KEY_PAIRED_AT)
        }
    }

    suspend fun getSnapshot(): SessionSnapshot? {
        val prefs = context.dataStore.data.first()
        val token = prefs[KEY_DEVICE_TOKEN] ?: return null
        val id = prefs[KEY_DEVICE_ID] ?: return null
        val url = prefs[KEY_SERVER_URL] ?: return null
        return SessionSnapshot(
            deviceId = id,
            deviceToken = token,
            serverUrl = url,
            deviceName = prefs[KEY_DEVICE_NAME] ?: "Android",
            pairedAt = prefs[KEY_PAIRED_AT] ?: 0L,
        )
    }
}

data class SessionSnapshot(
    val deviceId: String,
    val deviceToken: String,
    val serverUrl: String,
    val deviceName: String,
    val pairedAt: Long,
)
