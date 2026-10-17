package com.fuflomycin_rn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuflomycin_rn.data.Drug
import com.fuflomycin_rn.data.filterDrugs

@Composable
fun ListScreen(
    drugs: List<Drug>,
    onOpenDrug: (String) -> Unit,
    onOpenInfo: () -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val visible = filterDrugs(drugs, query)
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        ListBar(count = visible.drugs.size, query = query, onQuery = { query = it }, onOpenInfo = onOpenInfo)
        LazyColumn(
            contentPadding =
                androidx.compose.foundation.layout.PaddingValues(
                    bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding(),
                ),
        ) {
            if (visible.notice != null) {
                item {
                    Text(
                        text = visible.notice,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 16.sp,
                    )
                }
            }
            items(visible.drugs, key = { drug -> drug.id }) { drug ->
                Column(
                    Modifier.fillMaxWidth().clickable { onOpenDrug(drug.id) }.padding(horizontal = 16.dp, vertical = 12.dp),
                ) {
                    Text(
                        text = drug.title,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontSize = 16.sp,
                    )
                    if (drug.other.isNotEmpty()) {
                        Text(
                            text = drug.other.joinToString(", "),
                            modifier = Modifier.padding(top = 2.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                        )
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            }
        }
    }
}

@Composable
private fun ListBar(
    count: Int,
    query: String,
    onQuery: (String) -> Unit,
    onOpenInfo: () -> Unit,
) {
    ScreenBar {
        Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(24.dp),
            )
        }
        Column(Modifier.weight(1f).padding(horizontal = 8.dp)) {
            Text(
                text = "Препаратов: $count",
                color = Color.White,
                fontSize = 12.sp,
                lineHeight = 14.sp,
                maxLines = 1,
            )
            BasicTextField(
                value = query,
                onValueChange = onQuery,
                textStyle = TextStyle(color = Color.White, fontSize = 16.sp, lineHeight = 18.sp),
                cursorBrush = SolidColor(Color.White),
                singleLine = true,
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Препарат" },
                decorationBox = { inner ->
                    Column {
                        inner()
                        Box(Modifier.fillMaxWidth().height(1.dp).background(Color.White))
                    }
                },
            )
        }
        IconButton(onClick = onOpenInfo) {
            Icon(
                imageVector = Icons.Outlined.Info,
                contentDescription = "О РСП",
                tint = Color.White,
                modifier = Modifier.size(24.dp),
            )
        }
    }
}
