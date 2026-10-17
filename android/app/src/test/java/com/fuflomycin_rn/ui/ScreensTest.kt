package com.fuflomycin_rn.ui

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import com.fuflomycin_rn.data.drug
import com.fuflomycin_rn.ui.theme.FuflomycinTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ScreensTest {
    @get:Rule val rule = createComposeRule()

    private val arbidol =
        drug(
            id = "arbidol",
            title = "Арбидол",
            other = listOf("Арпетол"),
            mnn = "umifenovir",
        )

    @Test
    fun listFiltersAndOpensInfo() {
        var opened = 0
        rule.setContent {
            FuflomycinTheme {
                ListScreen(
                    drugs = listOf(arbidol),
                    onOpenDrug = {},
                    onOpenInfo = { opened += 1 },
                )
            }
        }

        rule.onNodeWithText("Арбидол").assertIsDisplayed()
        rule.onNodeWithText("Арпетол").assertIsDisplayed()
        rule.onNodeWithText("Препаратов: 1").assertIsDisplayed()
        rule.onNodeWithContentDescription("Препарат").performTextInput("нет-такого")
        rule.onNodeWithText("Препаратов: 0").assertIsDisplayed()
        rule.onNodeWithText("В списке такого нет.").assertIsDisplayed()
        rule.onNodeWithContentDescription("О РСП").performClick()
        assertEquals(1, opened)
    }

    @Test
    fun missingDrugShowsTheNotice() {
        rule.setContent {
            FuflomycinTheme {
                DrugScreen(drug = null, notice = "В списке такого нет.", onBack = {})
            }
        }

        rule.onNodeWithText("В списке такого нет.").assertIsDisplayed()
    }

    @Test
    fun drugShowsMnnLinks() {
        rule.setContent {
            FuflomycinTheme {
                DrugScreen(drug = arbidol, notice = null, onBack = {})
            }
        }

        rule.onNodeWithText("МНН: umifenovir").assertIsDisplayed()
        rule.onNodeWithText("Cochrane").assertIsDisplayed()
        rule.onNodeWithText("Pubmed").assertIsDisplayed()
        rule.onNodeWithContentDescription("Источник").assertIsDisplayed()
        rule.onNodeWithText("РСП / Фуфломицин").assertIsDisplayed()
    }

    @Test
    fun missingSourceHidesTheButton() {
        rule.setContent {
            FuflomycinTheme {
                DrugScreen(drug = drug(id = "arbidol", title = "Арбидол", source = ""), notice = null, onBack = {})
            }
        }

        rule.onAllNodesWithContentDescription("Источник").assertCountEquals(0)
    }

    @Test
    fun galleryDotsMarkTheCurrentFrame() {
        rule.setContent {
            FuflomycinTheme {
                DrugScreen(
                    drug = drug(id = "arbidol", title = "Арбидол", gallery = listOf("a.png", "b.png")),
                    notice = null,
                    onBack = {},
                )
            }
        }

        rule.onNodeWithContentDescription("Кадр 1 из 2").assertIsDisplayed()
    }

    @Test
    fun singleFrameHidesGalleryDots() {
        rule.setContent {
            FuflomycinTheme {
                DrugScreen(
                    drug = drug(id = "arbidol", title = "Арбидол", gallery = listOf("a.png")),
                    notice = null,
                    onBack = {},
                )
            }
        }

        rule.onAllNodesWithContentDescription("Кадр 1 из 1").assertCountEquals(0)
    }

    @Test
    fun infoShowsDisclaimerLegendAndGoesBack() {
        var backs = 0
        rule.setContent {
            FuflomycinTheme {
                InfoScreen(onBack = { backs += 1 })
            }
        }

        rule.onNodeWithText("Это не источник персональных медицинских рекомендаций.").assertIsDisplayed()
        rule.onNodeWithText("РСП — неполный список препаратов.").assertIsDisplayed()
        rule.onNodeWithText("Дополнение:").assertIsDisplayed()
        rule.onNodeWithText("Легенда").performScrollTo().assertIsDisplayed()
        rule.onNodeWithText("Github").performScrollTo().assertIsDisplayed()
        rule.onNodeWithContentDescription("Назад").performClick()
        assertEquals(1, backs)
    }

    @Test
    fun navigationOpensDrugAndReturnsToTheList() {
        rule.setContent {
            FuflomycinTheme {
                FuflomycinApp(catalogLoader = { listOf(arbidol) })
            }
        }

        rule.onNodeWithText("Арбидол").performClick()
        rule.onNodeWithText("МНН: umifenovir").assertIsDisplayed()
        rule.onNodeWithContentDescription("Назад").performClick()
        rule.onNodeWithText("Арбидол").assertIsDisplayed()
        rule.onNodeWithContentDescription("О РСП").performClick()
        rule.onNodeWithText("Легенда").performScrollTo().assertIsDisplayed()
    }
}
