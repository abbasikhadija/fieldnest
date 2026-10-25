import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
test('real connected sign-in, shared records, cross-tab sign-out and demo isolation', async ({
  page,
  context,
}) => {
  const accounts: { email: string; password: string }[] = JSON.parse(
    await readFile('.local/accounts.json', 'utf8'),
  )
  const login = async (target: Page, index: number) => {
    await target
      .getByLabel('Email', { exact: true })
      .fill(accounts[index].email)
    await target
      .getByLabel('Password', { exact: true })
      .fill(accounts[index].password)
    await target.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(
      target.getByRole('button', { name: /12 Willow Court/ }),
    ).toBeVisible()
  }
  await page.goto('./')
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  const group = page.getByRole('group', {
    name: 'Walls and ceilings are in good condition',
  })
  await group.getByRole('radio', { name: 'Fail', exact: true }).check()
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page
    .getByRole('link', { name: 'Open connected workspace', exact: true })
    .click()
  await login(page, 0)
  await page.getByRole('button', { name: /12 Willow Court/ }).click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Synchronized with server · Version 1' }),
  ).toBeVisible()
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
  const second = await context.newPage()
  await second.goto('./#/account')
  await expect(
    second.getByRole('button', { name: /12 Willow Court/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(second.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(
    second.getByRole('button', { name: /12 Willow Court/ }),
  ).toHaveCount(0)
  await login(page, 1)
  await page.getByRole('button', { name: /12 Willow Court/ }).click()
  await expect(page.getByText('Server draft · Version 1')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('link', { name: '← Local demo workspace' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  await expect(
    group.getByRole('radio', { name: 'Fail', exact: true }),
  ).toBeChecked()
})
