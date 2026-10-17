package com.fuflomycin_rn.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SearchTest {
    private val arbidol =
        drug(
            id = "arbidol",
            title = "Арбидол",
            other = listOf("Арпетол", "Умифеновир"),
            mnn = "umifenovir",
        )
    private val kagocel = drug(id = "kagocel", title = "Кагоцел", section = "Гомеопатия")
    private val hawthorn =
        drug(
            id = "nastoykaBoyaryshnika",
            title = "Настойка боярышника",
            label = "red",
            section = "Негативный перечень ФК",
        )
    private val zelenka = drug(id = "zelenka", title = "Зеленка")
    private val glued = drug(id = "glued", title = "Арби", other = listOf("дол"))
    private val catalog = listOf(arbidol, kagocel, hawthorn, zelenka, glued)

    @Test
    fun emptyQueryKeepsOrder() {
        val result = filterDrugs(catalog, "")

        assertEquals(
            listOf("arbidol", "kagocel", "nastoykaBoyaryshnika", "zelenka", "glued"),
            result.drugs.map { it.id },
        )
        assertNull(result.notice)
    }

    @Test
    fun matchesTitle() {
        val result = filterDrugs(catalog, "Арбидол")

        assertEquals(listOf("arbidol"), result.drugs.map { it.id })
        assertNull(result.notice)
    }

    @Test
    fun matchesAnySynonym() {
        assertEquals(listOf("arbidol"), filterDrugs(catalog, "Арпетол").drugs.map { it.id })
    }

    @Test
    fun matchesMnn() {
        assertEquals(listOf("arbidol"), filterDrugs(catalog, "umifenovir").drugs.map { it.id })
    }

    @Test
    fun missingQueryUsesTheNotice() {
        val result = filterDrugs(catalog, "нет-такого-препарата")

        assertEquals(emptyList<Drug>(), result.drugs)
        assertEquals(MISSING_NOTICE, result.notice)
    }

    @Test
    fun ignoresCase() {
        assertEquals(listOf("arbidol"), filterDrugs(catalog, "арбидол").drugs.map { it.id })
    }

    @Test
    fun yoMatchesYe() {
        assertEquals(listOf("zelenka"), filterDrugs(catalog, "зелёнка").drugs.map { it.id })
    }

    @Test
    fun cyrillicQueryMatchesLatinMnn() {
        val result =
            filterDrugs(
                listOf(drug(id = "arbidolMnn", title = "Арбидол", mnn = "umifenovir")),
                "умифеновир",
            )

        assertEquals(listOf("arbidolMnn"), result.drugs.map { it.id })
    }

    @Test
    fun sectionAndHtmlAreNotSearched() {
        assertEquals(MISSING_NOTICE, filterDrugs(catalog, "Гомеопатия").notice)
        assertEquals(MISSING_NOTICE, filterDrugs(catalog, "Вердикт").notice)
    }

    @Test
    fun doesNotGlueTitleSynonymAndMnn() {
        assertEquals(false, filterDrugs(catalog, "Арбидол").drugs.any { it.id == "glued" })
    }

    @Test
    fun keepsSpaces() {
        assertEquals(
            listOf("nastoykaBoyaryshnika"),
            filterDrugs(catalog, "Настойка боярышника").drugs.map { it.id },
        )
        assertEquals(MISSING_NOTICE, filterDrugs(catalog, "Настойкабоярышника").notice)
    }

    @Test
    fun hardAndSoftSignsMatchNothing() {
        val result = filterDrugs(catalog, "ъь")

        assertEquals(emptyList<Drug>(), result.drugs)
        assertEquals(MISSING_NOTICE, result.notice)
    }

    @Test
    fun lookupFindsTheDrug() {
        val result = lookupDrug(catalog, "arbidol")

        assertEquals(arbidol, result.drug)
        assertNull(result.notice)
    }

    @Test
    fun unknownIdUsesTheNoticeWithoutEchoingTheId() {
        val result = lookupDrug(catalog, "нет-такого-id")

        assertNull(result.drug)
        assertEquals(MISSING_NOTICE, result.notice)
        assertEquals(false, result.toString().contains("нет-такого-id"))
    }

    @Test
    fun mnnLinksAreCanonical() {
        val result = mnnSearch(arbidol)

        assertEquals("umifenovir", result?.mnn)
        assertEquals(
            "https://www.cochranelibrary.com/advanced-search?q=umifenovir&t=1",
            result?.cochraneUrl,
        )
        assertEquals(
            "https://pubmed.ncbi.nlm.nih.gov/?term=umifenovir&filter=pubt.meta-analysis&filter=pubt.randomizedcontrolledtrial",
            result?.pubmedUrl,
        )
    }

    @Test
    fun missingMnnHasNoBlock() {
        assertNull(mnnSearch(kagocel))
    }

    @Test
    fun mnnEncodesTheWholeValue() {
        val result = mnnSearch(drug(id = "spaced", title = "С пробелом", mnn = "foo bar"))

        assertEquals(
            "https://www.cochranelibrary.com/advanced-search?q=foo%20bar&t=1",
            result?.cochraneUrl,
        )
        assertEquals(
            "https://pubmed.ncbi.nlm.nih.gov/?term=foo%20bar&filter=pubt.meta-analysis&filter=pubt.randomizedcontrolledtrial",
            result?.pubmedUrl,
        )
    }
}

internal fun drug(
    id: String,
    title: String,
    other: List<String> = emptyList(),
    section: String = "РСП / Фуфломицин",
    label: String = "orange",
    mnn: String? = null,
    source: String = "https://example.test",
    gallery: List<String> = emptyList(),
    contents: String = "<p>Вердикт про Кагоцел в HTML.</p>",
): Drug {
    return Drug(
        id = id,
        title = title,
        other = other,
        section = section,
        label = label,
        source = source,
        contents = contents,
        gallery = gallery,
        mnn = mnn,
    )
}
