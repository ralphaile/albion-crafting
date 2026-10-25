import { defineConfig, devices } from "@playwright/test";

const appURL = "http://localhost:4173/albion-crafting/";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: appURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],
        },
      },
    },
  ],
  webServer: {
    command: "pnpm preview --port 4173 --strictPort",
    url: appURL,
  },
});
