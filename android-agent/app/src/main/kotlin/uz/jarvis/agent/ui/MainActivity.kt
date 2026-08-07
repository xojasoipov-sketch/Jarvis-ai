package uz.jarvis.agent.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import uz.jarvis.agent.ui.navigation.AppNavigation
import uz.jarvis.agent.ui.theme.JarvisTheme
import uz.jarvis.agent.ui.viewmodel.MainViewModel

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle deep link that launched the app
        intent?.data?.let { uri ->
            if (uri.scheme == "jarvis" && uri.host == "pair") {
                viewModel.handleDeepLink(uri)
            }
        }

        setContent {
            JarvisTheme {
                Surface(
                    modifier = Modifier.fillMaxSize().systemBarsPadding()
                ) {
                    val navController = rememberNavController()
                    AppNavigation(navController = navController, viewModel = viewModel)
                }
            }
        }
    }

    // Handle deep link when app is already running
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.let { uri ->
            if (uri.scheme == "jarvis" && uri.host == "pair") {
                viewModel.handleDeepLink(uri)
            }
        }
    }
}
