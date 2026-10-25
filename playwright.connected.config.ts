import { defineConfig } from '@playwright/test'
import foundation from './playwright.config'
export default defineConfig({
  ...foundation,
  testDir: './e2e-connected',
  timeout: 60000,
})
