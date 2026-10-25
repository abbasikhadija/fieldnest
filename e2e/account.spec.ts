import { test, expect } from '@playwright/test'
test('connected workspace stays separate from offline demo records', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: 'Open connected workspace →' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your assigned inspections' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '12 Willow Court' }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: '← Local demo workspace' }).click()
  await expect(
    page.getByRole('link', { name: /12 Willow Court/ }),
  ).toBeVisible()
})
