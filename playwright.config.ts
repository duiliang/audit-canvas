import { defineConfig, devices } from "@playwright/test";

const localWindowsBrowser =
  process.platform === "win32" && !process.env.CI ? { channel: "msedge" } : {};
const e2ePortValue = process.env.AUDIT_CANVAS_E2E_PORT ?? "4173";
const e2ePort = Number(e2ePortValue);

if (!Number.isInteger(e2ePort) || e2ePort < 1 || e2ePort > 65_535) {
  throw new Error("AUDIT_CANVAS_E2E_PORT must be an integer between 1 and 65535.");
}

const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command: `pnpm --filter @audit-canvas/web exec vite --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
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
