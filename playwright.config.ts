import { defineConfig, devices } from '@playwright/test'

// An explicit remote target runs the same checks without starting a local server.
const remoteURL = process.env.FIELDNEST_BASE_URL
const baseURL = remoteURL ?? 'http://127.0.0.1:4173/fieldnest/'
const target = new URL(baseURL)
if (target.pathname !== '/fieldnest/' || target.search || target.hash ||
  (remoteURL && target.protocol !== 'https:')) {
  throw new Error('FIELDNEST_BASE_URL must be an HTTPS URL ending in /fieldnest/ with no query or fragment.')
}

export default defineConfig({
  testDir: './e2e',
  use: { baseURL },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: remoteURL ? undefined : {
    command: 'npm run preview -- --port 4173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
