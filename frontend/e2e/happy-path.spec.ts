import { expect, test } from "@playwright/test"

/**
 * Happy path: from empty state to a rendered chart.
 *
 * 5 assertions exercising the full SSE stream:
 *  1. Empty state shows the suggested prompts
 *  2. Clicking a prompt sends a question (user bubble appears)
 *  3. The thinking block surfaces (raisonnement)
 *  4. A tool call card renders for `query_data`
 *  5. A figure or table surfaces in the response
 */
test("happy path: ask a data question and see a result", async ({ page }) => {
  await page.goto("/")

  // 1. Empty state with suggested prompts is visible
  const promptButton = page.getByRole("button", {
    name: /évolution des ventes mensuelles par produit en 2024/i,
  })
  await expect(promptButton).toBeVisible()

  // 2. Click sends the question — the user bubble appears with that text
  await promptButton.click()
  await expect(
    page.getByText(/évolution des ventes mensuelles par produit en 2024/i),
  ).toBeVisible()

  // 3. Thinking block appears (collapsed trigger labelled "Réfléchit…" or "Raisonnement")
  await expect(page.getByText(/réfléchit|raisonnement/i).first()).toBeVisible({
    timeout: 60_000,
  })

  // 4. Tool call card renders with the query_data tool name
  await expect(page.getByText("query_data").first()).toBeVisible({
    timeout: 60_000,
  })

  // 5. Either a Plotly figure (figure[role=group]) or a result table surfaces
  const figureOrTable = page.locator('figure[role="group"], table').first()
  await expect(figureOrTable).toBeVisible({ timeout: 90_000 })
})
