package com.fuflomycin_rn.data

import kotlin.math.ceil
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private val heightJson = Json { ignoreUnknownKeys = true }

fun contentHeightFromMessage(data: String): Int {
    val parsed =
        try {
            heightJson.parseToJsonElement(data).jsonObject
        } catch (_: Exception) {
            return 0
        }
    val keys =
        listOf(
            "bodyScroll",
            "bodyOffset",
            "deScroll",
            "deOffset",
            "sentinelBottom",
            "lastPBottom",
            "bodyBottom",
        )
    var max = 0.0
    for (key in keys) {
        val value = parsed[key]?.jsonPrimitive?.doubleOrNull ?: continue
        if (value.isFinite() && value > max) {
            max = value
        }
    }
    if (max <= 0.0) {
        return 0
    }
    return ceil(max).toInt()
}
