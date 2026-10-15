package com.fuflomycin_rn.ui

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.SentimentVeryDissatisfied
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.net.toUri
import com.fuflomycin_rn.data.Drug
import com.fuflomycin_rn.data.contentHeightFromMessage
import com.fuflomycin_rn.data.mnnSearch
import com.fuflomycin_rn.ui.theme.Brand
import com.fuflomycin_rn.ui.theme.LocalLinkColor
import com.fuflomycin_rn.ui.theme.labelColor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun DrugScreen(
    drug: Drug?,
    notice: String?,
    onBack: () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        DrugBar(title = drug?.title, onBack = onBack)
        if (drug == null) {
            Text(
                text = notice.orEmpty(),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 16.sp,
            )
        } else {
            DrugBody(drug)
        }
    }
}

@Composable
private fun DrugBar(title: String?, onBack: () -> Unit) {
    Surface(color = Brand) {
        Row(
            modifier =
                Modifier.statusBarsPadding()
                    .heightIn(min = 56.dp)
                    .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = "Назад",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp),
                )
            }
            if (title != null) {
                Text(
                    text = title,
                    modifier = Modifier.weight(1f),
                    color = Color.White,
                    fontSize = 20.sp,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun DrugBody(drug: Drug) {
    val mnn = mnnSearch(drug)
    Column(Modifier.verticalScroll(rememberScrollState())) {
        Gallery(drug.gallery)
        Row(
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = drug.title,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 24.sp,
            )
            if (drug.source.isNotEmpty()) {
                val context = LocalContext.current
                IconButton(onClick = { openUrl(context, drug.source) }) {
                    Icon(
                        imageVector = Icons.Filled.Link,
                        contentDescription = "Источник",
                        tint = MaterialTheme.colorScheme.onBackground,
                    )
                }
            }
        }
        if (drug.other.isNotEmpty()) {
            Text(
                text = drug.other.joinToString(", "),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp,
            )
        }
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.SentimentVeryDissatisfied,
                contentDescription = null,
                tint = labelColor(drug.label),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = drug.section,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 16.sp,
            )
        }
        VerdictHtml(html = drug.contents)
        if (mnn != null) {
            MnnBlock(mnn.mnn, mnn.cochraneUrl, mnn.pubmedUrl)
        }
    }
}

@Composable
private fun Gallery(names: List<String>) {
    if (names.isEmpty()) {
        return
    }
    val pagerState = rememberPagerState { names.size }
    HorizontalPager(
        state = pagerState,
        modifier = Modifier.fillMaxWidth().height(300.dp),
    ) { page ->
        GalleryFrame(names[page])
    }
}

@Composable
private fun GalleryFrame(name: String) {
    val context = LocalContext.current
    var image by remember(name) { mutableStateOf<androidx.compose.ui.graphics.ImageBitmap?>(null) }
    LaunchedEffect(name) {
        val bitmap =
            withContext(Dispatchers.IO) {
                runCatching {
                    context.assets.open("catalog/img/$name").use { stream ->
                        BitmapFactory.decodeStream(stream)
                    }
                }.getOrNull()
            }
        if (bitmap != null) {
            image = bitmap.asImageBitmap()
        }
    }
    val frame = image
    if (frame != null) {
        Image(
            bitmap = frame,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Fit,
        )
    }
}

@Composable
private fun MnnBlock(mnn: String, cochraneUrl: String, pubmedUrl: String) {
    val context = LocalContext.current
    Column(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 24.dp)) {
        Text(
            text = "МНН: $mnn",
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = 16.sp,
        )
        Text(
            text = "Поиск по базам медпрепаратов:",
            modifier = Modifier.padding(top = 8.dp),
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = 20.sp,
        )
        Row(Modifier.padding(top = 8.dp)) {
            MnnButton("Cochrane") { openUrl(context, cochraneUrl) }
            MnnButton("Pubmed") { openUrl(context, pubmedUrl) }
        }
    }
}

@Composable
private fun MnnButton(label: String, onClick: () -> Unit) {
    val link = LocalLinkColor.current
    Box(
        modifier =
            Modifier.border(1.dp, link)
                .clickable(onClick = onClick)
                .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(text = label, color = link, fontWeight = FontWeight.Bold)
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun VerdictHtml(html: String) {
    val link = LocalLinkColor.current
    val text = MaterialTheme.colorScheme.onBackground
    val background = MaterialTheme.colorScheme.background
    val document =
        remember(html, link, text, background) {
            wrapVerdictHtml(html, text, link, background)
        }
    var height by remember(document) { mutableIntStateOf(1) }
    AndroidView(
        modifier = Modifier.fillMaxWidth().height(height.dp),
        factory = { context ->
            val bridge = VerdictBridge()
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.allowFileAccess = false
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                addJavascriptInterface(bridge, "VerdictHeight")
                tag = VerdictHolder(bridge)
                webViewClient =
                    object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView,
                            request: WebResourceRequest,
                        ): Boolean {
                            val scheme = request.url.scheme
                            if (scheme == "http" || scheme == "https") {
                                openUrl(view.context, request.url.toString())
                                return true
                            }
                            return false
                        }
                    }
            }
        },
        update = { webView ->
            val holder = webView.tag as VerdictHolder
            holder.bridge.onHeight = { next -> height = next }
            if (holder.document != document) {
                holder.document = document
                webView.loadDataWithBaseURL(null, document, "text/html", "utf-8", null)
            }
        },
        onRelease = { webView -> webView.destroy() },
    )
}

private class VerdictHolder(val bridge: VerdictBridge, var document: String? = null)

class VerdictBridge {
    private val main = Handler(Looper.getMainLooper())

    @Volatile var onHeight: (Int) -> Unit = {}

    @JavascriptInterface
    fun postHeight(raw: String) {
        val callback = onHeight
        val next = contentHeightFromMessage(raw)
        if (next > 0) {
            main.post { callback(next) }
        }
    }
}

private fun wrapVerdictHtml(html: String, text: Color, link: Color, background: Color): String {
    val textHex = text.toHex()
    val linkHex = link.toHex()
    val backgroundHex = background.toHex()
    return """
        <!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          html,body{background:$backgroundHex;margin:0}
          body{margin:16px;font:16px/1.5 sans-serif;color:$textHex}
          a{color:$linkHex}
        </style></head><body>$html<div id="s"></div><script>
        (function(){
          var s=document.getElementById('s');
          var paras=document.getElementsByTagName('p');
          var lastP=paras[paras.length-1];
          VerdictHeight.postHeight(JSON.stringify({
            bodyScroll:document.body.scrollHeight,
            bodyOffset:document.body.offsetHeight,
            deScroll:document.documentElement.scrollHeight,
            deOffset:document.documentElement.offsetHeight,
            sentinelBottom:s?s.getBoundingClientRect().bottom:0,
            lastPBottom:lastP?lastP.getBoundingClientRect().bottom:0,
            bodyBottom:document.body.getBoundingClientRect().bottom
          }));
        })();
        </script></body></html>
        """.trimIndent()
}

private fun Color.toHex(): String {
    val red = (this.red * 255).toInt()
    val green = (this.green * 255).toInt()
    val blue = (this.blue * 255).toInt()
    return "#%02X%02X%02X".format(red, green, blue)
}

fun openUrl(context: Context, url: String) {
    context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
}
