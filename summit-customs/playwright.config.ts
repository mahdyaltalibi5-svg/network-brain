import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      // software WebGL in headless CI containers
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
