package com.fuflomycin_rn.ui.theme

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test

class LabelColorTest {
    @Test
    fun keepsTheThreeVerdictColors() {
        assertEquals(Color.Red, labelColor("red"))
        assertEquals(Color(0xFFFFA500), labelColor("orange"))
        assertEquals(Color.Yellow, labelColor("yellow"))
    }

    @Test
    fun unknownLabelStaysRed() {
        assertEquals(Color.Red, labelColor("purple"))
    }
}
