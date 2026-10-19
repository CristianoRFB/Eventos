import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/report", open: "never" }],
    ["json", { outputFile: "test-results/playwright-results.json" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: ["--host-resolver-rules=MAP *.example.test 127.0.0.1"],
    },
  },
  projects: [
    { name: "api", testMatch: "integration/**/*.spec.ts" },
    {
      name: "desktop",
      testMatch: "e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      testMatch: "e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://localhost:5173/healthz",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
