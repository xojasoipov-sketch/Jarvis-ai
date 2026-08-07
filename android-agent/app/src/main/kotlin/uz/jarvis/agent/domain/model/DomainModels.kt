package uz.jarvis.agent.domain.model

sealed class PairingResult {
    data class Success(val deviceId: String, val deviceToken: String, val serverUrl: String) : PairingResult()
    data class Failure(val message: String) : PairingResult()
}

data class AgentStatus(
    val isPaired: Boolean,
    val deviceName: String,
    val deviceId: String,
    val serverUrl: String,
    val battery: Int,
    val lastHeartbeat: Long,
    val isRunning: Boolean,
)

data class PendingCommand(
    val id: String,
    val command: String,
    val params: Map<String, String>,
)

sealed class CommandResult {
    data class Ok(val payload: String) : CommandResult()
    data class Err(val message: String) : CommandResult()
}

// Deep link parsed from jarvis://pair?...
data class PairingDeepLink(
    val deviceId: String,
    val token: String,
    val server: String,
)
