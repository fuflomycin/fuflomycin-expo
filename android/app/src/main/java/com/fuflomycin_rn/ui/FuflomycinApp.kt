package com.fuflomycin_rn.ui

import com.fuflomycin_rn.data.Drug
import com.fuflomycin_rn.data.loadCatalog
import com.fuflomycin_rn.data.lookupDrug
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navDeepLink
import androidx.navigation.toRoute
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable

@Serializable data object ListRoute

@Serializable data object InfoRoute

@Serializable data class DrugRoute(val id: String)

@Composable
fun FuflomycinApp(catalogLoader: (suspend () -> List<Drug>)? = null) {
    val context = LocalContext.current
    var drugs by remember { mutableStateOf<List<Drug>?>(null) }
    LaunchedEffect(Unit) {
        drugs =
            withContext(Dispatchers.IO) {
                catalogLoader?.invoke() ?: loadCatalog(context.assets)
            }
    }
    val catalog = drugs
    if (catalog == null) {
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background))
        return
    }
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = ListRoute) {
        composable<ListRoute>(
            deepLinks =
                listOf(
                    navDeepLink<ListRoute>(basePath = "fuflomycin://"),
                ),
        ) {
            ListScreen(
                drugs = catalog,
                onOpenDrug = { id -> navController.navigate(DrugRoute(id)) },
                onOpenInfo = { navController.navigate(InfoRoute) },
            )
        }
        composable<InfoRoute>(
            deepLinks =
                listOf(
                    navDeepLink<InfoRoute>(basePath = "fuflomycin://info"),
                    navDeepLink { uriPattern = "fuflomycin:///info" },
                ),
        ) {
            InfoScreen(onBack = { navigateBack(navController) })
        }
        composable<DrugRoute>(
            deepLinks =
                listOf(
                    navDeepLink<DrugRoute>(basePath = "fuflomycin://drug"),
                    navDeepLink { uriPattern = "fuflomycin:///{id}" },
                    navDeepLink { uriPattern = "fuflomycin://{id}" },
                ),
        ) { entry ->
            val id = entry.toRoute<DrugRoute>().id
            if (id == "info") {
                LaunchedEffect(Unit) {
                    navController.navigate(InfoRoute) {
                        popUpTo(DrugRoute(id)) { inclusive = true }
                    }
                }
            } else {
                val lookup = lookupDrug(catalog, id)
                DrugScreen(
                    drug = lookup.drug,
                    notice = lookup.notice,
                    onBack = { navigateBack(navController) },
                )
            }
        }
    }
}

private fun navigateBack(navController: NavController) {
    if (!navController.popBackStack()) {
        navController.navigate(ListRoute) {
            popUpTo(navController.graph.id) { inclusive = true }
            launchSingleTop = true
        }
    }
}
