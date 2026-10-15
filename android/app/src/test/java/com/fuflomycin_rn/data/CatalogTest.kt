package com.fuflomycin_rn.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CatalogTest {
    @Test
    fun decodesADrugAndOmitsAnEmptyMnn() {
        val drugs =
            decodeCatalog(
                """
                [{"id":"arbidol","title":"Арбидол","other":["Арпетол"],"section":"РСП","label":"orange","source":"https://example.test","contents":"<p>x</p>","gallery":[]}]
                """.trimIndent(),
            )

        assertEquals("arbidol", drugs.single().id)
        assertEquals(listOf("Арпетол"), drugs.single().other)
        assertNull(drugs.single().mnn)
    }

    @Test
    fun keepsMnnWhenPresent() {
        val drugs =
            decodeCatalog(
                """
                [{"id":"a","title":"А","other":[],"section":"s","label":"red","source":"","contents":"","gallery":["a.png"],"mnn":"foo bar"}]
                """.trimIndent(),
            )

        assertEquals("foo bar", drugs.single().mnn)
        assertEquals(listOf("a.png"), drugs.single().gallery)
    }
}
