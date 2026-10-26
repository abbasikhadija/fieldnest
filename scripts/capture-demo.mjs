import { preview } from 'vite'
import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const server = await preview({ preview: { host: '127.0.0.1', port: 4176, strictPort: true } })
const browser = await chromium.launch()
try {
  await mkdir('docs/images', { recursive: true })
  for (const [name, device] of [['desktop', devices['Desktop Chrome']], ['mobile', devices['Pixel 7']]]) {
    const context = await browser.newContext(device)
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4176/fieldnest/')
    await page.getByRole('button', { name: 'Try Fieldnest' }).click()
    await page.getByRole('link', { name: /12 Willow Court/ }).waitFor()
    if (name === 'desktop') await page.screenshot({ path: 'docs/images/my-work.png' })
    await page.getByRole('link', { name: /12 Willow Court/ }).click()
    await page.getByRole('group', { name: 'Walls and ceilings are in good condition' }).getByRole('radio', { name: 'Pass', exact: true }).check()
    await page.getByRole('group', { name: 'Floors and doors are safe and functional' }).getByRole('radio', { name: 'Fail', exact: true }).check()
    await page.getByRole('status').filter({ hasText: /^Saved on this device/ }).waitFor()
    await page.getByRole('heading', { name: 'General condition', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `docs/images/inspection-${name}.png` })
    await context.close()
  }
  console.log('Captured actual local-demo screens using isolated fictional data; no account credentials used.')
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
