package com.fuflomycin_rn.data

import org.junit.Assert.assertEquals
import org.junit.Test

class VerdictHeightTest {
    @Test
    fun adaptolUsesTheTallerMeasurement() {
        val probe =
            """{"bodyScroll":296,"bodyOffset":296,"deScroll":328,"deOffset":328,"deClient":296,"innerH":296,"scale":1,"sentinelBottom":328,"lastPBottom":312,"bodyBottom":312,"when":"inline"}"""

        assertEquals(328, contentHeightFromMessage(probe))
    }

    @Test
    fun garbageAndNonPositiveHeightsAreZero() {
        assertEquals(0, contentHeightFromMessage("не json"))
        assertEquals(0, contentHeightFromMessage("""{"bodyScroll":0,"bodyOffset":-1}"""))
    }
}
