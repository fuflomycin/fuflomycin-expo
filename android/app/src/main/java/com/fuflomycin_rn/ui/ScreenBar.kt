package com.fuflomycin_rn.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fuflomycin_rn.ui.theme.Brand

@Composable
fun ScreenBar(content: @Composable RowScope.() -> Unit) {
    Surface(color = Brand) {
        Row(
            modifier = Modifier.statusBarsPadding().height(56.dp).padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            content = content,
        )
    }
}
