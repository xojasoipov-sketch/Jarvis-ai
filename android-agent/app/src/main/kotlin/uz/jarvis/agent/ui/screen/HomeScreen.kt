package uz.jarvis.agent.ui.screen

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import uz.jarvis.agent.domain.model.PairingDeepLink
import uz.jarvis.agent.service.AgentForegroundService
import uz.jarvis.agent.ui.theme.*
import uz.jarvis.agent.ui.viewmodel.MainViewModel
import uz.jarvis.agent.ui.viewmodel.UiState
import java.text.SimpleDateFormat
import java.util.*

/**
 * Batareya optimizatsiyasidan ozod qilishni so'raydi — bitta tizim dialogi
 * ("Ruxsat berish" bosilsa tamom). Buni bermasa, Infinix (XOS), Xiaomi (MIUI)
 * kabi tizimlar ilova recents'dan o'chirilgach fon xizmatini bir necha
 * daqiqada o'ldiradi, ulanish uziladi. Allaqachon ruxsat berilgan bo'lsa
 * hech narsa qilmaydi.
 */
private fun requestIgnoreBatteryOptimizations(context: Context) {
    val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
    if (pm.isIgnoringBatteryOptimizations(context.packageName)) return
    try {
        context.startActivity(
            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
        )
    } catch (_: Exception) {
        // Ba'zi OEM prošivkalarda bu ekran mavjud emas — jimgina o'tkazib yuboramiz.
    }
}

/**
 * "Boshqa ilovalar ustidan chizish" ruxsati sahifasini ochadi.
 *
 * Bu ruxsatsiz Android 10+ da fon xizmati ilova/sozlama/URL ocholmaydi —
 * open_app, open_url, open_settings kabi buyruqlar jimgina bloklanadi
 * (xato ham bermaydi, shunchaki hech narsa ochilmaydi). Shu sababli
 * ulanishdan keyin bir marta so'raladi.
 */
private fun requestOverlayPermission(context: Context) {
    if (Settings.canDrawOverlays(context)) return
    try {
        context.startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    } catch (_: Exception) {
        // Ba'zi OEM prošivkalarda bu ekran yo'q — jimgina o'tkazamiz.
    }
}

/** Agentga kerakli barcha runtime ruxsatlar — auto-connect boshida birma-bir so'raladi. */
private fun requiredPermissions(): List<String> = buildList {
    add(Manifest.permission.CAMERA)
    add(Manifest.permission.ACCESS_FINE_LOCATION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        add(Manifest.permission.POST_NOTIFICATIONS)
        add(Manifest.permission.READ_MEDIA_IMAGES)
    } else {
        add(Manifest.permission.READ_EXTERNAL_STORAGE)
    }
    add(Manifest.permission.RECORD_AUDIO)
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    viewModel: MainViewModel = hiltViewModel(),
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

                is UiState.Connecting -> {
                    // Ruxsatlarni birma-bir so'raydi, natijadan qat'i nazar (bekor qilinsa ham) davom etib,
                    // avtomatik ulanishni (auto-pair) boshlaydi — QR yoki qo'lda kod kiritish shart emas.
                    val permState = rememberMultiplePermissionsState(
                        permissions = requiredPermissions(),
                        onPermissionsResult = { viewModel.autoConnect() },
                    )
                    LaunchedEffect(Unit) {
                        if (permState.allPermissionsGranted) {
                            viewModel.autoConnect()
                        } else {
                            permState.launchMultiplePermissionRequest()
                        }
                    }
                    ConnectingContent()
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
                            onClick = { viewModel.retryConnect() },
                            colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                        ) {
                            Text("Qayta urinish")
                        }
                    }
                }

                is UiState.Paired -> {
                    // Ulangandan so'ng agent qo'lda tugma bosmasdan, avtomatik fon rejimida ishga tushadi.
                    LaunchedEffect(state.deviceId) {
                        if (!state.isRunning) {
                            AgentForegroundService.start(context)
                            viewModel.setAgentRunning(true)
                        }
                        requestIgnoreBatteryOptimizations(context)
                        // Buyruqlar (ilova/sozlama ochish) ishlashi uchun shart —
                        // batareya dialogidan keyin ko'rsatiladi.
                        kotlinx.coroutines.delay(1500)
                        requestOverlayPermission(context)
                    }
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
private fun ConnectingContent() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
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
            CircularProgressIndicator(color = AccentOrange, modifier = Modifier.size(32.dp), strokeWidth = 3.dp)
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "Ulanmoqda...",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            Text(
                "Ruxsatlar so'ralmoqda va server bilan\navtomatik bog'lanmoqda",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp,
            )
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
