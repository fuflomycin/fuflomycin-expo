package com.fuflomycin_rn.data

import kotlinx.serialization.Serializable

@Serializable
data class Drug(
    val id: String,
    val title: String,
    val other: List<String> = emptyList(),
    val section: String,
    val label: String,
    val source: String,
    val contents: String,
    val gallery: List<String> = emptyList(),
    val mnn: String? = null,
)
