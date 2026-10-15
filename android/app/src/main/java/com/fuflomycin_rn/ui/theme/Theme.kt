package com.fuflomycin_rn.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

val Brand = Color(0xFFFF5959)
val LightLink = Color(0xFF1976D2)
val DarkLink = Color(0xFF8AB4F8)

private val LightColors =
    lightColorScheme(
        primary = Brand,
        onPrimary = Color.White,
        background = Color.White,
        onBackground = Color(0xFF111111),
        surface = Color.White,
        onSurface = Color(0xFF111111),
        onSurfaceVariant = Color(0xFF666666),
        outline = Color(0xFFE0E0E0),
    )

private val DarkColors =
    darkColorScheme(
        primary = Brand,
        onPrimary = Color.White,
        background = Color(0xFF121212),
        onBackground = Color(0xFFF5F5F5),
        surface = Color(0xFF121212),
        onSurface = Color(0xFFF5F5F5),
        onSurfaceVariant = Color(0xFFB3B3B3),
        outline = Color(0xFF2C2C2C),
    )

val LocalLinkColor = staticCompositionLocalOf { LightLink }

@Composable
fun FuflomycinTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val link = if (dark) DarkLink else LightLink
    CompositionLocalProvider(LocalLinkColor provides link) {
        MaterialTheme(
            colorScheme = if (dark) DarkColors else LightColors,
            content = content,
        )
    }
}

fun labelColor(label: String): Color {
    return when (label) {
        "orange" -> Color(0xFFFFA500)
        "yellow" -> Color.Yellow
        else -> Color.Red
    }
}
