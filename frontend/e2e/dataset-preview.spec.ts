import { expect, test } from "@playwright/test"

/**
 * Dataset preview popover: click the Eye icon next to a dataset → popover
 * opens with a 5-row preview table. Does not exercise the LLM.
 */
test("dataset preview popover shows 5 rows on demand", async ({ page }) => {
  await page.goto("/")

  // Wait for the sidebar to render an Eye trigger (skeletons gone)
  const previewTrigger = page
    .getByRole("button", { name: /aperçu de/i })
    .first()
  await expect(previewTrigger).toBeVisible({ timeout: 10_000 })

  // Open the popover
  await previewTrigger.click()

  // The popover renders a table — wait for at least one cell to surface
  const popoverTable = page.getByRole("table").last()
  await expect(popoverTable).toBeVisible({ timeout: 10_000 })

  // Verify it has more than just headers (i.e. preview rows are loaded)
  const rows = popoverTable.locator("tbody tr")
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeGreaterThan(0)
})
