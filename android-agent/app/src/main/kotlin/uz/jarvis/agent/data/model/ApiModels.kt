package uz.jarvis.agent.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

// ─── Pairing ──────────────────────────────────────────────────────────────────

// Auto-pair: birinchi ochilishda, QR/deep-link almashinuvisiz — Authorization headerida
// APK ichiga qattiq yozilgan AUTO_PAIR_KEY yuboriladi, javob PairConfirmResponse bilan bir xil.
@Serializable
data class AutoPairRequest(
    @SerialName("name") val name: String,
    @SerialName("platform") val platform: String = "android",
    @SerialName("model") val model: String,
    @SerialName("os_version") val osVersion: String,
    @SerialName("app_version") val appVersion: String,
)

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
    // Server (device-store.ts / /api/devices/poll) sends "action" + "payload",
    // not "command" + "params" — field names must match the live API contract exactly.
    @SerialName("action") val command: String,
    // JsonObject ishlatamiz — server payload'da string bo'lmagan qiymatlar
    // (raqam, boolean, null) bo'lishi mumkin; Map<String,String> bular uchun crash bo'ladi.
    @SerialName("payload") val rawPayload: JsonObject = JsonObject(emptyMap()),
    @SerialName("created_at") val createdAt: String? = null,
) {
    /** Barcha qiymatlarni String'ga aylantiradi: "50" → "50", true → "true" va h.k. */
    val params: Map<String, String>
        get() = rawPayload.entries.associate { (k, v) ->
            k to try { v.jsonPrimitive.content } catch (_: Exception) { v.toString().trim('"') }
        }
}

@Serializable
data class CommandResultRequest(
    // Server (/api/devices/result) reads body.cmd_id, not command_id.
    @SerialName("cmd_id") val commandId: String,
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
