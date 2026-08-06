package uz.jarvis.agent.ui.viewmodel

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.jarvis.agent.data.repository.AgentRepositoryImpl
import uz.jarvis.agent.data.storage.SecureTokenStore
import uz.jarvis.agent.domain.model.*
import javax.inject.Inject

sealed class UiState {
    data object Loading : UiState()
    data object Unpaired : UiState()
    data class Pairing(val link: PairingDeepLink) : UiState()
    data object PairingInProgress : UiState()
    data class PairingError(val message: String) : UiState()
    data class Paired(
        val deviceName: String,
        val deviceId: String,
        val serverUrl: String,
        val pairedAt: Long,
        val battery: Int,
        val isRunning: Boolean,
    ) : UiState()
}

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repo: AgentRepositoryImpl,
    private val store: SecureTokenStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _agentRunning = MutableStateFlow(false)
    val agentRunning: StateFlow<Boolean> = _agentRunning.asStateFlow()

    init {
        checkPairingStatus()
    }

    fun checkPairingStatus() {
        viewModelScope.launch {
            val session = repo.getSession()
            if (session == null) {
                _uiState.value = UiState.Unpaired
            } else {
                _uiState.value = UiState.Paired(
                    deviceName = session.deviceName,
                    deviceId = session.deviceId,
                    serverUrl = session.serverUrl,
                    pairedAt = session.pairedAt,
                    battery = 0,
                    isRunning = _agentRunning.value,
                )
            }
        }
    }

    // Called from MainActivity when deep link arrives
    fun handleDeepLink(uri: Uri) {
        val deviceId = uri.getQueryParameter("device_id") ?: return
        val token = uri.getQueryParameter("token") ?: return
        val server = uri.getQueryParameter("server") ?: return

        val link = PairingDeepLink(deviceId = deviceId, token = token, server = server)
        _uiState.value = UiState.Pairing(link)
    }

    fun confirmPairing(link: PairingDeepLink) {
        _uiState.value = UiState.PairingInProgress
        viewModelScope.launch {
            when (val result = repo.confirmPairing(link)) {
                is PairingResult.Success -> checkPairingStatus()
                is PairingResult.Failure -> _uiState.value = UiState.PairingError(result.message)
            }
        }
    }

    fun onQrScanned(rawValue: String) {
        // Parse jarvis://pair?device_id=...&token=...&server=...
        runCatching {
            val uri = Uri.parse(rawValue)
            if (uri.scheme == "jarvis" && uri.host == "pair") {
                handleDeepLink(uri)
            } else {
                _uiState.value = UiState.PairingError("Noto'g'ri QR kod")
            }
        }.onFailure {
            _uiState.value = UiState.PairingError("QR o'qib bo'lmadi")
        }
    }

    fun setAgentRunning(running: Boolean) {
        _agentRunning.value = running
        checkPairingStatus()
    }

    fun revokeDevice() {
        viewModelScope.launch {
            repo.revokeDevice()
            _uiState.value = UiState.Unpaired
        }
    }

    fun cancelPairing() {
        _uiState.value = UiState.Unpaired
    }
}
