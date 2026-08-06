package uz.jarvis.agent.ui.screen

import android.Manifest
import android.os.Build
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.*
import uz.jarvis.agent.ui.theme.*

data class PermItem(val name: String, val permission: String, val icon: ImageVector, val reason: String)

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionsScreen(onDone: () -> Unit) {
    val permissions = remember {
        buildList {
            add(PermItem("Kamera", Manifest.permission.CAMERA, Icons.Default.CameraAlt, "QR skanerlash uchun"))
            add(PermItem("Joylashuv", Manifest.permission.ACCESS_FINE_LOCATION, Icons.Default.LocationOn, "get_location buyrug'i uchun"))
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(PermItem("Bildirishnomalar", Manifest.permission.POST_NOTIFICATIONS, Icons.Default.Notifications, "send_notification uchun"))
                add(PermItem("Rasm/Video", Manifest.permission.READ_MEDIA_IMAGES, Icons.Default.Photo, "Fayllar uchun"))
            } else {
                add(PermItem("Fayl o'qish", Manifest.permission.READ_EXTERNAL_STORAGE, Icons.Default.Folder, "Fayllar uchun"))
            }
            add(PermItem("Mikrofon", Manifest.permission.RECORD_AUDIO, Icons.Default.Mic, "voice_record uchun"))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Ruxsatlar", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text("Agent buyruqlarini to'liq bajarishi uchun ruxsatlar kerak", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)

        Spacer(Modifier.height(8.dp))

        permissions.forEach { item ->
            val state = rememberPermissionState(item.permission)
            PermissionRow(
                item = item,
                granted = state.status.isGranted,
                onRequest = { state.launchPermissionRequest() },
            )
        }

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = onDone,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
        ) {
            Text("Tayyor", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun PermissionRow(item: PermItem, granted: Boolean, onRequest: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(item.icon, null, tint = if (granted) SuccessGreen else AccentOrange, modifier = Modifier.size(22.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Text(item.reason, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }

        if (granted) {
            Icon(Icons.Default.CheckCircle, null, tint = SuccessGreen, modifier = Modifier.size(20.dp))
        } else {
            TextButton(
                onClick = onRequest,
                contentPadding = PaddingValues(horizontal = 8.dp),
            ) {
                Text("Ruxsat", color = AccentOrange, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
