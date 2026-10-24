import { test, expect } from '@playwright/test'
test('subpath navigation, assets, and cached offline reload', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'My work' })).toBeVisible()
  const manifest = await (await page.request.get('manifest.webmanifest')).json()
  expect(manifest.start_url).toBe('/fieldnest/')
  expect(manifest.scope).toBe('/fieldnest/')
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await page.request.get(icon.src)).ok()).toBe(true)
  }
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toBe('http://127.0.0.1:4173/fieldnest/')
  await page.reload()
  await page.getByRole('link', { name: 'Activity', exact: true }).click()
  await expect(page).toHaveURL(/fieldnest\/#\/activity$/)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('You’re offline')
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
