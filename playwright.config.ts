import { defineConfig, devices } from "@playwright/test";

const localWindowsBrowser =
  process.platform === "win32" && !process.env.CI ? { channel: "msedge" } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5188",
    trace: "on-first-retry"
  },
  webServer: {
    command: "node tests/e2e/serve-real-workspace.mjs",
    url: "http://127.0.0.1:5188",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...localWindowsBrowser }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], ...localWindowsBrowser }
    }
  ]
});
