package uz.jarvis.agent.ui.screen

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.jarvis.agent.domain.model.PairingDeepLink
import uz.jarvis.agent.service.AgentForegroundService
import uz.jarvis.agent.ui.theme.*
import uz.jarvis.agent.ui.viewmodel.MainViewModel
import uz.jarvis.agent.ui.viewmodel.UiState
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HomeScreen(
    viewModel: MainViewModel = hiltViewModel(),
    onOpenScanner: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Logo
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(AccentOrange),
                contentAlignment = Alignment.Center,
            ) {
                Text("⚡", fontSize = 18.sp)
            }

            Spacer(Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Jarvis Agent",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
                Text(
                    "Pari AI Device Agent",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted,
                )
            }

            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Outlined.Settings, "Sozlamalar", tint = TextSecondary)
            }
        }

        Spacer(Modifier.height(40.dp))

        // State content
        AnimatedContent(targetState = uiState, label = "state") { state ->
            when (state) {
                is UiState.Loading -> {
                    CircularProgressIndicator(color = AccentOrange)
                }

                is UiState.Unpaired -> {
                    UnpairedContent(onScan = onOpenScanner)
                }

                is UiState.Pairing -> {
                    PairingConfirmContent(
                        link = state.link,
                        onConfirm = { viewModel.confirmPairing(state.link) },
                        onCancel = { viewModel.cancelPairing() },
                    )
                }

                is UiState.PairingInProgress -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        CircularProgressIndicator(color = AccentOrange, modifier = Modifier.size(48.dp))
                        Text(
                            "Server bilan bog'lanilmoqda...",
                            color = TextSecondary,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }

                is UiState.PairingError -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Icon(Icons.Default.ErrorOutline, null, tint = ErrorRed, modifier = Modifier.size(48.dp))
                        Text(state.message, color = ErrorRed, textAlign = TextAlign.Center)
                        Button(
                            onClick = { viewModel.cancelPairing() },
                            colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                        ) {
                            Text("Qayta urinish")
                        }
                    }
                }

                is UiState.Paired -> {
                    PairedContent(
                        state = state,
                        onStartAgent = {
                            AgentForegroundService.start(context)
                            viewModel.setAgentRunning(true)
                        },
                        onStopAgent = {
                            AgentForegroundService.stop(context)
                            viewModel.setAgentRunning(false)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun UnpairedContent(onScan: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        // Hero icon
        Box(
            modifier = Modifier
                .size(96.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(
                    Brush.radialGradient(
                        listOf(AccentOrange.copy(alpha = 0.2f), Color.Transparent)
                    )
                )
                .border(1.dp, AccentOrange.copy(alpha = 0.3f), RoundedCornerShape(28.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.QrCodeScanner,
                null,
                tint = AccentOrange,
                modifier = Modifier.size(44.dp),
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "Hali ulanmagan",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            Text(
                "Pari AI dashboardidagi QR kodni\nKamera orqali skanerlang",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp,
            )
        }

        // Steps
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            listOf(
                "Pari AI → Qurilmalar bo'limini oching",
                "\"QR Pairing\" tugmasini bosing",
                "Quyidagi tugma bilan QR ni skanerlang",
            ).forEachIndexed { i, step ->
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(AccentOrange),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("${i + 1}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Text(step, style = MaterialTheme.typography.bodySmall, color = TextSecondary, lineHeight = 18.sp)
                }
            }
        }

        Button(
            onClick = onScan,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
        ) {
            Icon(Icons.Default.QrCodeScanner, null)
            Spacer(Modifier.width(8.dp))
            Text("QR Skanerlash", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun PairingConfirmContent(
    link: PairingDeepLink,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Icon(Icons.Default.DevicesOther, null, tint = AccentOrange, modifier = Modifier.size(56.dp))

        Text(
            "Qurilmani ulash",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
        )

        // Info card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            InfoRow("Server", link.server)
            InfoRow("Device ID", link.deviceId.take(12) + "...")
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = onConfirm,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
            ) {
                Text("Ulashni tasdiqlash", fontWeight = FontWeight.SemiBold)
            }
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
                Text("Bekor qilish", color = TextSecondary)
            }
        }
    }
}

@Composable
private fun PairedContent(
    state: UiState.Paired,
    onStartAgent: () -> Unit,
    onStopAgent: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Status badge
        Row(
            modifier = Modifier
                .clip(CircleShape)
                .background(if (state.isRunning) SuccessGreen.copy(alpha = 0.12f) else TextMuted.copy(alpha = 0.1f))
                .padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .clip(CircleShape)
                    .background(if (state.isRunning) SuccessGreen else TextMuted)
            )
            Text(
                if (state.isRunning) "Agent faol" else "Agent to'xtatilgan",
                fontSize = 12.sp,
                color = if (state.isRunning) SuccessGreen else TextMuted,
                fontWeight = FontWeight.Medium,
            )
        }

        // Device info card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Qurilma ma'lumotlari", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            InfoRow("Nomi", state.deviceName)
            InfoRow("ID", state.deviceId.take(12) + "...")
            InfoRow("Server", state.serverUrl)
            InfoRow("Ulangan", SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(Date(state.pairedAt)))
        }

        // Control
        if (state.isRunning) {
            OutlinedButton(
                onClick = onStopAgent,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, ErrorRed.copy(alpha = 0.5f)),
            ) {
                Icon(Icons.Default.Stop, null, tint = ErrorRed)
                Spacer(Modifier.width(8.dp))
                Text("Agentni to'xtatish", color = ErrorRed, fontWeight = FontWeight.Medium)
            }
        } else {
            Button(
                onClick = onStartAgent,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
            ) {
                Icon(Icons.Default.PlayArrow, null)
                Spacer(Modifier.width(8.dp))
                Text("Agentni ishga tushirish", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextMuted)
        Text(value, style = MaterialTheme.typography.bodySmall, color = TextSecondary, fontWeight = FontWeight.Medium)
    }
}
