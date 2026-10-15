package com.fuflomycin_rn.data

data class FilteredList(
    val drugs: List<Drug>,
    val notice: String?,
)

data class DrugLookup(
    val drug: Drug?,
    val notice: String?,
)

data class MnnSearch(
    val mnn: String,
    val cochraneUrl: String,
    val pubmedUrl: String,
)

const val MISSING_NOTICE = "В списке такого нет."

fun filterDrugs(drugs: List<Drug>, query: String): FilteredList {
    if (query.isEmpty()) {
        return FilteredList(drugs, null)
    }
    val needle = normalize(query)
    if (needle.isEmpty()) {
        return FilteredList(emptyList(), MISSING_NOTICE)
    }
    val matches = drugs.filter { drug -> matchesQuery(drug, needle) }
    if (matches.isEmpty()) {
        return FilteredList(emptyList(), MISSING_NOTICE)
    }
    return FilteredList(matches, null)
}

fun lookupDrug(drugs: List<Drug>, id: String): DrugLookup {
    val drug = drugs.find { it.id == id }
    if (drug == null) {
        return DrugLookup(null, MISSING_NOTICE)
    }
    return DrugLookup(drug, null)
}

fun mnnSearch(drug: Drug): MnnSearch? {
    val mnn = drug.mnn
    if (mnn.isNullOrEmpty()) {
        return null
    }
    val encoded = encodeUriComponent(mnn)
    return MnnSearch(
        mnn = mnn,
        cochraneUrl = "https://www.cochranelibrary.com/advanced-search?q=$encoded&t=1",
        pubmedUrl =
            "https://pubmed.ncbi.nlm.nih.gov/?term=$encoded&filter=pubt.meta-analysis&filter=pubt.randomizedcontrolledtrial",
    )
}

private fun matchesQuery(drug: Drug, needle: String): Boolean {
    if (containsNeedle(drug.title, needle)) {
        return true
    }
    if (drug.other.any { synonym -> containsNeedle(synonym, needle) }) {
        return true
    }
    return drug.mnn != null && containsNeedle(drug.mnn, needle)
}

private fun containsNeedle(value: String, needle: String): Boolean {
    return normalize(value).contains(needle)
}

private val cyrillicToLatin =
    mapOf(
        'а' to "a",
        'б' to "b",
        'в' to "v",
        'г' to "g",
        'д' to "d",
        'е' to "e",
        'ж' to "zh",
        'з' to "z",
        'и' to "i",
        'й' to "y",
        'к' to "k",
        'л' to "l",
        'м' to "m",
        'н' to "n",
        'о' to "o",
        'п' to "p",
        'р' to "r",
        'с' to "s",
        'т' to "t",
        'у' to "u",
        'ф' to "f",
        'х' to "h",
        'ц' to "ts",
        'ч' to "ch",
        'ш' to "sh",
        'щ' to "shch",
        'ы' to "y",
        'э' to "e",
        'ю' to "yu",
        'я' to "ya",
        'ъ' to "",
        'ь' to "",
    )

private fun normalize(value: String): String {
    val folded = value.lowercase().replace("ё", "е")
    return buildString {
        for (char in folded) {
            append(cyrillicToLatin[char] ?: char.toString())
        }
    }
}

private fun encodeUriComponent(value: String): String {
    return buildString {
        for (char in value) {
            val plain =
                char in 'A'..'Z' ||
                    char in 'a'..'z' ||
                    char in '0'..'9' ||
                    char == '-' ||
                    char == '_' ||
                    char == '.' ||
                    char == '!' ||
                    char == '~' ||
                    char == '*' ||
                    char == '\'' ||
                    char == '(' ||
                    char == ')'
            if (plain) {
                append(char)
            } else {
                for (byte in char.toString().encodeToByteArray()) {
                    append('%')
                    append("%02X".format(byte.toInt() and 0xFF))
                }
            }
        }
    }
}
