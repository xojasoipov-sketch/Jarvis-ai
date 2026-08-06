package uz.jarvis.agent.data.repository

import uz.jarvis.agent.data.api.JarvisApiService
import uz.jarvis.agent.data.model.*
import uz.jarvis.agent.data.storage.SecureTokenStore
import uz.jarvis.agent.domain.model.*
import uz.jarvis.agent.util.DeviceInfo
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AgentRepositoryImpl @Inject constructor(
    private val api: JarvisApiService,
    private val store: SecureTokenStore,
    private val deviceInfo: DeviceInfo,
) {
    suspend fun confirmPairing(link: PairingDeepLink): PairingResult {
        return try {
            val resp = api.confirmPairing(
                PairConfirmRequest(
                    deviceId = link.deviceId,
                    token = link.token,
                    name = deviceInfo.deviceName(),
                    model = deviceInfo.model(),
                    osVersion = deviceInfo.osVersion(),
                    appVersion = deviceInfo.appVersion(),
                )
            )
            if (resp.isSuccessful) {
                val body = resp.body()!!
                store.saveSession(
                    deviceId = body.deviceId,
                    deviceToken = body.deviceToken,
                    serverUrl = link.server,
                    deviceName = body.name ?: deviceInfo.deviceName(),
                )
                PairingResult.Success(body.deviceId, body.deviceToken, link.server)
            } else {
                PairingResult.Failure("Server xatosi: ${resp.code()} ${resp.message()}")
            }
        } catch (e: Exception) {
            PairingResult.Failure("Ulanish xatosi: ${e.message}")
        }
    }

    suspend fun heartbeat(): Boolean {
        val session = store.getSnapshot() ?: return false
        return try {
            val resp = api.heartbeat(
                bearerToken = "Bearer ${session.deviceToken}",
                request = HeartbeatRequest(
                    deviceId = session.deviceId,
                    battery = deviceInfo.batteryLevel(),
                ),
            )
            resp.isSuccessful
        } catch (_: Exception) {
            false
        }
    }

    suspend fun pollCommands(): List<PendingCommand> {
        val session = store.getSnapshot() ?: return emptyList()
        return try {
            val resp = api.pollCommands(
                bearerToken = "Bearer ${session.deviceToken}",
                deviceId = session.deviceId,
            )
            resp.body()?.commands?.map { cmd ->
                PendingCommand(id = cmd.id, command = cmd.command, params = cmd.params)
            } ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun postResult(commandId: String, result: CommandResult) {
        val session = store.getSnapshot() ?: return
        try {
            api.postResult(
                bearerToken = "Bearer ${session.deviceToken}",
                request = CommandResultRequest(
                    commandId = commandId,
                    deviceId = session.deviceId,
                    result = when (result) {
                        is CommandResult.Ok -> result.payload
                        is CommandResult.Err -> result.message
                    },
                    status = if (result is CommandResult.Ok) "done" else "error",
                    error = if (result is CommandResult.Err) result.message else null,
                )
            )
        } catch (_: Exception) {}
    }

    suspend fun revokeDevice(): Boolean {
        val session = store.getSnapshot() ?: return false
        return try {
            val resp = api.revokeDevice(
                bearerToken = "Bearer ${session.deviceToken}",
                body = mapOf("device_id" to session.deviceId),
            )
            store.clearSession()
            resp.isSuccessful
        } catch (_: Exception) {
            store.clearSession()
            false
        }
    }

    suspend fun isPaired() = store.isPaired()
    suspend fun getSession() = store.getSnapshot()
}
