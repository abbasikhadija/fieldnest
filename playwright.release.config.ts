import { defineConfig, devices } from '@playwright/test'
import foundation from './playwright.config'
export default defineConfig({
  ...foundation,
  testDir: './e2e-release',
  timeout: 60000,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
})
