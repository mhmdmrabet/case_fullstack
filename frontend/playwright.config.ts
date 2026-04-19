import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for the happy-path E2E.
 *
 * Assumes the full stack is already running on http://localhost:5173
 * (e.g. `docker compose up`). The test exercises the agent so a valid
 * LLM API key must be configured in `.env` before running.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
