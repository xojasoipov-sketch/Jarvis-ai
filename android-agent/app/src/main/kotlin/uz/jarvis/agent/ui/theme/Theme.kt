package uz.jarvis.agent.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Brand colors — matches Pari AI web (#ff6a1a accent, #0b0d14 background)
val AccentOrange = Color(0xFFFF6A1A)
val AccentOrangeLight = Color(0xFFFF8C48)
val SurfaceDark = Color(0xFF0F1219)
val SurfaceCard = Color(0xFF151821)
val SurfaceBorder = Color(0xFF1E2332)
val TextPrimary = Color(0xFFFFFFFF)
val TextSecondary = Color(0xFF8A94A6)
val TextMuted = Color(0xFF4A5568)
val SuccessGreen = Color(0xFF22C55E)
val ErrorRed = Color(0xFFEF4444)

private val DarkColorScheme = darkColorScheme(
    primary = AccentOrange,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF3D1A00),
    onPrimaryContainer = AccentOrangeLight,
    secondary = Color(0xFF64748B),
    onSecondary = Color.White,
    background = Color(0xFF0B0D14),
    onBackground = TextPrimary,
    surface = SurfaceDark,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceCard,
    onSurfaceVariant = TextSecondary,
    outline = SurfaceBorder,
    error = ErrorRed,
    onError = Color.White,
)

@Composable
fun JarvisTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography(),
        content = content,
    )
}
