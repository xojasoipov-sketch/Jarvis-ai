package uz.jarvis.agent.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uz.jarvis.agent.ui.theme.*
import uz.jarvis.agent.ui.viewmodel.MainViewModel
import uz.jarvis.agent.ui.viewmodel.UiState

@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    onBack: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    var showRevokeDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Toolbar
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, null, tint = TextPrimary)
            }
            Text("Sozlamalar", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TextPrimary)
        }

        Spacer(Modifier.height(8.dp))

        // About section
        SettingsSection("Ilova haqida") {
            SettingsRow(icon = Icons.Default.Info, label = "Versiya", value = "1.0.0")
            SettingsRow(icon = Icons.Default.Android, label = "Platforma", value = "Android")
            SettingsRow(icon = Icons.Default.Shield, label = "Xavfsizlik", value = "Android Keystore")
        }

        // Connection section
        if (uiState is UiState.Paired) {
            val state = uiState as UiState.Paired
            SettingsSection("Ulanish") {
                SettingsRow(icon = Icons.Default.Link, label = "Server", value = state.serverUrl)
                SettingsRow(icon = Icons.Default.Fingerprint, label = "Device ID", value = state.deviceId.take(16) + "...")
            }
        }

        // Danger zone
        if (uiState is UiState.Paired) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(ErrorRed.copy(alpha = 0.05f))
                    .border(1.dp, ErrorRed.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("Xavfli zona", style = MaterialTheme.typography.labelMedium, color = ErrorRed, fontWeight = FontWeight.SemiBold)

                OutlinedButton(
                    onClick = { showRevokeDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.5f)),
                ) {
                    Icon(Icons.Default.LinkOff, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Qurilmani uzish")
                }
            }
        }
    }

    if (showRevokeDialog) {
        AlertDialog(
            onDismissRequest = { showRevokeDialog = false },
            title = { Text("Qurilmani uzish", color = TextPrimary) },
            text = { Text("Bu qurilma serverdan uzilib, token o'chiriladi. Ilova qayta avtomatik ulanadi — hech narsa kiritish shart emas.", color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.revokeDevice()
                    showRevokeDialog = false
                    onBack()
                }) {
                    Text("Uzish", color = ErrorRed, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRevokeDialog = false }) {
                    Text("Bekor", color = TextSecondary)
                }
            },
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}

@Composable
private fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(title, style = MaterialTheme.typography.labelSmall, color = TextMuted, fontWeight = FontWeight.SemiBold)
        content()
    }
}

@Composable
private fun SettingsRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(icon, null, tint = TextMuted, modifier = Modifier.size(16.dp))
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodySmall, color = TextPrimary, fontWeight = FontWeight.Medium)
    }
}
