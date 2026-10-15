package com.fuflomycin_rn.data

import android.content.res.AssetManager
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val catalogJson = Json { ignoreUnknownKeys = true }

fun decodeCatalog(json: String): List<Drug> {
    return catalogJson.decodeFromString(ListSerializer(Drug.serializer()), json)
}

fun loadCatalog(assets: AssetManager): List<Drug> {
    val json =
        assets.open("catalog/list.json").bufferedReader().use { reader ->
            reader.readText()
        }
    return decodeCatalog(json)
}
