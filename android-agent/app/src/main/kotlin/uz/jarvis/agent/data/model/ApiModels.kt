package uz.jarvis.agent.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Pairing ──────────────────────────────────────────────────────────────────

@Serializable
data class PairConfirmRequest(
    @SerialName("device_id") val deviceId: String,
    @SerialName("token") val token: String,
    @SerialName("name") val name: String,
    @SerialName("platform") val platform: String = "android",
    @SerialName("model") val model: String,
    @SerialName("os_version") val osVersion: String,
    @SerialName("app_version") val appVersion: String,
)

@Serializable
data class PairConfirmResponse(
    @SerialName("device_token") val deviceToken: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("name") val name: String? = null,
)

// ─── Heartbeat ────────────────────────────────────────────────────────────────

@Serializable
data class HeartbeatRequest(
    @SerialName("device_id") val deviceId: String,
    @SerialName("battery") val battery: Int? = null,
    @SerialName("status") val status: String = "online",
)

@Serializable
data class HeartbeatResponse(
    @SerialName("ok") val ok: Boolean,
)

// ─── Commands ─────────────────────────────────────────────────────────────────

@Serializable
data class PollResponse(
    @SerialName("commands") val commands: List<DeviceCommand>,
)

@Serializable
data class DeviceCommand(
    @SerialName("id") val id: String,
    @SerialName("command") val command: String,
    @SerialName("params") val params: Map<String, String> = emptyMap(),
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class CommandResultRequest(
    @SerialName("command_id") val commandId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("result") val result: String,
    @SerialName("status") val status: String = "done", // done | error
    @SerialName("error") val error: String? = null,
)

@Serializable
data class CommandResultResponse(
    @SerialName("ok") val ok: Boolean,
)

// ─── Device Info ──────────────────────────────────────────────────────────────

@Serializable
data class DeviceStatusResult(
    @SerialName("device_id") val deviceId: String,
    @SerialName("name") val name: String,
    @SerialName("platform") val platform: String,
    @SerialName("model") val model: String,
    @SerialName("os_version") val osVersion: String,
    @SerialName("app_version") val appVersion: String,
    @SerialName("battery") val battery: Int,
    @SerialName("storage_free_mb") val storageFreeM: Long,
    @SerialName("storage_total_mb") val storageTotalMb: Long,
    @SerialName("uptime_seconds") val uptimeSeconds: Long,
)
