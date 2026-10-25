import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
test('offline completion survives reload and lost acknowledgment, then another account retrieves it', async ({
  page,
  browser,
  context,
}) => {
  const fixture: { id: string; property: string } = JSON.parse(
    execFileSync(process.execPath, ['scripts/browser-fixture.mjs', 'create'], {
      encoding: 'utf8',
      windowsHide: true,
    }),
  )
  const accounts: { email: string; password: string }[] = JSON.parse(
    await readFile('.local/accounts.json', 'utf8'),
  )
  const login = async (target: Page, index: number) => {
    await target.goto('./#/account')
    await target
      .getByLabel('Email', { exact: true })
      .fill(accounts[index].email)
    await target
      .getByLabel('Password', { exact: true })
      .fill(accounts[index].password)
    await target.getByRole('button', { name: 'Sign in', exact: true }).click()
    await target
      .getByRole('button', { name: new RegExp(fixture.property) })
      .click()
  }
  let secondContext
  try {
    await login(page, 0)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await context.setOffline(true)
    for (const group of await page.getByRole('group').all())
      await group.getByRole('radio', { name: 'Pass', exact: true }).check()
    await page
      .getByLabel('Additional observations')
      .fill('Completed offline and recovered safely.')
    await page
      .getByRole('button', { name: 'Complete inspection', exact: true })
      .click()
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Saved on this device · Waiting to sync' }),
    ).toBeVisible()
    await page.reload()
    await page
      .getByRole('button', { name: new RegExp(fixture.property) })
      .click()
    await expect(page.getByLabel('Additional observations')).toHaveValue(
      'Completed offline and recovered safely.',
    )
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(8)
    let dropped = false
    const ids: string[] = []
    await context.route(
      '**/rest/v1/rpc/apply_inspection_operation',
      async (route) => {
        const body = route.request().postDataJSON() as {
          operation_id: string
          inspection_id: string
        }
        if (body.inspection_id !== fixture.id) {
          await route.continue()
          return
        }
        ids.push(body.operation_id)
        const response = await route.fetch()
        if (!dropped) {
          dropped = true
          await route.abort('failed')
          return
        }
        await route.fulfill({ response })
      },
    )
    await context.setOffline(false)
    // Reverification remounts the account workspace; reopen the cached inspection.
    await page
      .getByRole('button', { name: new RegExp(fixture.property) })
      .click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Synchronized with server' }),
    ).toBeVisible({ timeout: 20000 })
    expect(dropped).toBe(true)
    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(ids[1]).toBe(ids[0])
    secondContext = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    })
    const second = await secondContext.newPage()
    await login(second, 1)
    await expect(second.getByRole('radio', { checked: true })).toHaveCount(8)
    await expect(second.getByLabel('Additional observations')).toHaveValue(
      'Completed offline and recovered safely.',
    )
    await expect(
      second.getByRole('status').filter({ hasText: 'Version 3' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page.getByLabel('Additional observations')).toHaveCount(0)
  } finally {
    await context.setOffline(false)
    await secondContext?.close()
    execFileSync(
      process.execPath,
      ['scripts/browser-fixture.mjs', 'delete', fixture.id],
      { windowsHide: true },
    )
  }
})
