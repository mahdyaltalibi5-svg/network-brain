import { defineConfig } from "@playwright/test";

const PORT = 3199;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, launchOptions: { executablePath: process.env.PW_CHROMIUM } },
  webServer: {
    // Fresh throwaway database per run; no Meta credentials, so nothing leaves the machine.
    command: `rm -rf .data/e2e && next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CRM_PASSWORD: "e2e-password",
      CRM_SESSION_SECRET: "e2e-session-secret-e2e-session-secret",
      CRM_PGLITE_DIR: "./.data/e2e",
    },
  },
});
