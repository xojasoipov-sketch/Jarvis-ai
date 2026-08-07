package uz.jarvis.agent.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import uz.jarvis.agent.ui.screen.*
import uz.jarvis.agent.ui.viewmodel.MainViewModel

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object QrScanner : Screen("qr_scanner")
    data object Permissions : Screen("permissions")
    data object Settings : Screen("settings")
}

@Composable
fun AppNavigation(
    navController: NavHostController,
    viewModel: MainViewModel,
) {
    NavHost(navController = navController, startDestination = Screen.Home.route) {
        composable(Screen.Home.route) {
            HomeScreen(
                viewModel = viewModel,
                onOpenSettings = { navController.navigate(Screen.Settings.route) },
            )
        }
        composable(Screen.QrScanner.route) {
            QrScannerScreen(
                onScanned = { raw ->
                    viewModel.onQrScanned(raw)
                    navController.popBackStack()
                },
                onBack = { navController.popBackStack() },
            )
        }
        composable(Screen.Permissions.route) {
            PermissionsScreen(
                onDone = { navController.popBackStack() }
            )
        }
        composable(Screen.Settings.route) {
            SettingsScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
