import { defineConfig } from "@playwright/test";

export default defineConfig({
  workers: 2,
  projects: [
    {
      name: "desktop",
      use: { viewport: { height: 900, width: 1440 } },
    },
    {
      name: "mobile",
      use: { viewport: { height: 844, width: 390 } },
    },
  ],
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: false,
  },
});
