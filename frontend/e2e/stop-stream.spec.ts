import { expect, test } from "@playwright/test"

/**
 * Stop button: while the agent is streaming, the Send button is replaced by
 * Stop. Clicking Stop cancels the stream cleanly and the composer becomes
 * available again.
 */
test("stop button cancels the running stream", async ({ page }) => {
  await page.goto("/")

  // Trigger a long-ish run via a suggested prompt
  await page
    .getByRole("button", {
      name: /évolution des ventes mensuelles par produit en 2024/i,
    })
    .click()

  // The composer button transitions Send → Stop while streaming
  const stopButton = page.getByRole("button", { name: /^stop$/i })
  await expect(stopButton).toBeVisible({ timeout: 30_000 })

  // Cancel the run
  await stopButton.click()

  // After cancellation the Send button is back (composer is usable again)
  await expect(page.getByRole("button", { name: /^send$/i })).toBeVisible({
    timeout: 15_000,
  })
})
