import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

test('primary screens meet automated accessibility checks', async ({ page }) => {
  await page.goto('./')
  const check = async () => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(result.violations.map(({ id, nodes }) => ({ id, elements: nodes.map((node) => node.target) }))).toEqual([])
  }
  await page.getByRole('button', { name: 'Try Fieldnest' }).waitFor()
  await check()
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  await check()
  await page.getByRole('button', { name: '5. Review', exact: true }).click()
  await check()
  for (let index = 1; index <= 4; index++) {
    await page.getByRole('button', { name: new RegExp(`^${index}\\. `) }).click()
    for (const group of await page.getByRole('group').all())
      await group.getByRole('radio', { name: 'Pass', exact: true }).check()
  }
  await page.getByRole('button', { name: '5. Review', exact: true }).click()
  await page.getByRole('button', { name: 'Complete inspection', exact: true }).click()
  await page.getByRole('heading', { name: 'Completed inspection', exact: true }).waitFor()
  await check()
  for (const name of ['Activity', 'Settings'] as const) {
    await page.getByRole('link', { name, exact: true }).click()
    await check()
  }
  await page.goto('./#/account')
  await page.getByRole('heading', { level: 1 }).waitFor()
  await check()
  await page.context().setOffline(true)
  await page.getByRole('status').filter({ hasText: 'You’re offline' }).waitFor()
  await check()
  await page.context().setOffline(false)
})

test('keyboard section changes and missing-answer recovery keep focus visible on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  await page.getByRole('button', { name: 'Next section →' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '5. Review', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review your inspection' })).toBeFocused()
  await page.getByRole('button', { name: 'Finish general condition' }).click()
  await expect(page.getByRole('heading', { name: 'General condition', exact: true })).toBeFocused()
  await page.getByRole('radio', { name: 'Pass', exact: true }).first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Fail', exact: true }).first()).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const sizes = await page.locator('.option-group label').evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().height))
  expect(sizes.every((height) => height >= 44)).toBe(true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `test-results/m6-inspection-${test.info().project.name}.png`, fullPage: true })
})
