package com.fuflomycin_rn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuflomycin_rn.ui.theme.Brand

private const val GITHUB_URL = "https://github.com/fuflomycin/fuflomycin-expo"
private const val BOOSTY_URL = "https://boosty.to/bndby"
private const val RSP_URL = "https://encyclopatia.ru/wiki/Расстрельный_список_препаратов"

@Composable
fun InfoScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
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
                Text(
                    text = "О справочнике",
                    modifier = Modifier.weight(1f),
                    color = Color.White,
                    fontSize = 20.sp,
                    maxLines = 1,
                )
            }
        }
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(16.dp).padding(bottom = 16.dp),
        ) {
            Heading("О справочнике")
            Paragraph("Это не источник персональных медицинских рекомендаций.")
            Paragraph("Исходный код Справочника и карточек доступен на GitHub.")
            ActionButton("Github", GITHUB_URL)
            Heading("Поддержка")
            Paragraph("Поддержать развитие Справочника:")
            ActionButton("Boosty", BOOSTY_URL)
            Paragraph("Справочник содержит неполный список препаратов трёх категорий:")
            RspLine()
            Paragraph("• Гомеопатия")
            Paragraph("• Негативный перечень ФК (Формулярный комитет РАМН)")
            Paragraph(
                "Список препаратов сформирован на основе отсутствия убедительных данных об эффективности по заявленным показаниям, как того требует доказательная медицина, а также по отсутствию в авторитетных источниках и рекомендациях.",
            )
            Text(
                text = "Легенда",
                modifier = Modifier.padding(top = 12.dp, bottom = 10.dp),
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 20.sp,
            )
            Legend("РСП — Расстрельный список препаратов. Составлен врачом Никитой Жуковым.")
            Legend(
                "Cochrane, Pubmed, FDA, RXlist — авторитетные источники информации об исследованиях или препаратах, конечно, это не все, но наиболее известные, они индексируют подавляющее большинство работ как высокого качества, так и не очень.",
            )
            Legend("МНН — международное непатентованное наименование вещества.")
            Legend("ВОЗ — всемирная организация здравоохранения, держит руку на пульсе по данным о лечении")
            Legend(
                "ЖНВЛП — российский перечень жизненно необходимых и важнейших лекарственных препаратов, куда попадают как нормальные лекарства, так и бесполезные, потому что таблетки из этого перечня сбывать намного легче: это государственное лобби.",
            )
            Legend(
                "РКИ — рандомизированное клиническое исследование, оплот доказательной медицины; у некоторых препаратов находится парочка таковых, но доказательств они не прибавляют, обычно по причине плохого качества.",
            )
            Legend("РЛС — регистр лекарственных средств России")
            Legend("ФК — формулярный комитет РАМН, наиболее здравомыслящий проект минздрава")
        }
    }
}

@Composable
private fun Heading(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(bottom = 8.dp),
        color = MaterialTheme.colorScheme.onBackground,
        fontSize = 20.sp,
    )
}

@Composable
private fun Paragraph(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(bottom = 8.dp),
        color = MaterialTheme.colorScheme.onBackground,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    )
}

@Composable
private fun Legend(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(bottom = 10.dp),
        color = MaterialTheme.colorScheme.onBackground,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    )
}

@Composable
private fun ActionButton(label: String, url: String) {
    val context = LocalContext.current
    Box(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            modifier =
                Modifier.clickable { openUrl(context, url) }
                    .background(Brand, RoundedCornerShape(4.dp))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            color = Color.White,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun RspLine() {
    val text =
        buildAnnotatedString {
            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onBackground)) {
                append("• РСП — ")
            }
            withLink(
                LinkAnnotation.Url(
                    url = RSP_URL,
                    styles = TextLinkStyles(style = SpanStyle(color = Brand)),
                ),
            ) {
                append("расстрельный список препаратов")
            }
            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onBackground)) {
                append(" Никиты Жукова")
            }
        }
    Text(
        text = text,
        modifier = Modifier.padding(bottom = 8.dp),
        fontSize = 16.sp,
        lineHeight = 24.sp,
    )
}
