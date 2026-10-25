import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

for (const choice of ['device', 'server'] as const) {
  test(`two accounts review a conflict and keep the ${choice} copy safely`, async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(90000)
    const fixture: { id: string; property: string } = JSON.parse(
      execFileSync(
        process.execPath,
        ['scripts/browser-fixture.mjs', 'create'],
        { encoding: 'utf8', windowsHide: true },
      ),
    )
    const accounts: { email: string; password: string }[] = JSON.parse(
      await readFile('.local/accounts.json', 'utf8'),
    )
    const other = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      viewport: test.info().project.use.viewport,
      isMobile: test.info().project.use.isMobile,
      hasTouch: test.info().project.use.hasTouch,
    })
    const second = await other.newPage()
    async function open(target: Page) {
      await target
        .getByRole('button', { name: new RegExp(fixture.property) })
        .click()
    }
    async function login(target: Page, index: number) {
      await target.goto('./#/account')
      await target
        .getByLabel('Email', { exact: true })
        .fill(accounts[index].email)
      await target
        .getByLabel('Password', { exact: true })
        .fill(accounts[index].password)
      await target.getByRole('button', { name: 'Sign in', exact: true }).click()
      await open(target)
      await target.evaluate(async () => {
        await navigator.serviceWorker.ready
      })
    }
    const synced = (target: Page) =>
      target.getByRole('status').filter({ hasText: 'Synchronized with server' })
    try {
      await login(page, 0)
      await login(second, 1)
      await context.setOffline(true)
      await other.setOffline(true)
      await page
        .getByLabel('Additional observations')
        .fill('Copy from inspector A')
      await second
        .getByLabel('Additional observations')
        .fill('Copy from inspector B')
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'Saved on this device · Waiting to sync' }),
      ).toBeVisible()
      await expect(
        second
          .getByRole('status')
          .filter({ hasText: 'Saved on this device · Waiting to sync' }),
      ).toBeVisible()
      await page
        .getByRole('group', {
          name: 'Walls and ceilings are in good condition',
        })
        .getByRole('radio', { name: 'Pass', exact: true })
        .check()
      await second
        .getByRole('group', {
          name: 'Walls and ceilings are in good condition',
        })
        .getByRole('radio', { name: 'Fail', exact: true })
        .check()
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'Saved on this device · Waiting to sync' }),
      ).toBeVisible()
      await expect(
        second
          .getByRole('status')
          .filter({ hasText: 'Saved on this device · Waiting to sync' }),
      ).toBeVisible()
      await context.setOffline(false)
      await open(page)
      await expect(synced(page)).toBeVisible({ timeout: 20000 })
      await other.setOffline(false)
      await open(second)
      await expect(
        second.getByRole('heading', { name: 'Review conflicting changes' }),
      ).toBeVisible()
      const wallComparison = second
        .getByRole('row')
        .filter({ hasText: 'Walls and ceilings are in good condition' })
      await expect(
        wallComparison.getByRole('cell', { name: 'Pass', exact: true }),
      ).toBeVisible()
      await expect(
        wallComparison.getByRole('cell', { name: 'Fail', exact: true }),
      ).toBeVisible()
      await expect(
        second.getByRole('cell', {
          name: /Copy from inspector A/,
        }),
      ).toBeVisible()
      await expect(
        second.getByRole('cell', {
          name: /Copy from inspector B/,
        }),
      ).toBeVisible()
      await second.reload()
      await open(second)
      await expect(
        second.getByRole('heading', { name: 'Review conflicting changes' }),
      ).toBeVisible()
      const decision = second.getByRole('radio', {
        name: choice === 'device' ? /Apply my device copy/ : /Use server copy/,
      })
      await expect(decision).toBeEnabled()
      await second.screenshot({
        path: `test-results/m4-conflict-${test.info().project.name}.png`,
        fullPage: true,
      })
      await decision.check()
      if (choice === 'device') {
        // Change the server after B's review. B must see another conflict.
        await page
          .getByLabel('Additional observations')
          .fill('A changed during review')
        await expect(synced(page)).toBeVisible({ timeout: 20000 })
      }
      await second
        .getByRole('button', {
          name:
            choice === 'device'
              ? 'Queue reviewed device copy'
              : 'Save reviewed server copy',
          exact: true,
        })
        .click()
      if (choice === 'device') {
        await expect(
          second.getByRole('cell', {
            name: /A changed during review/,
          }),
        ).toBeVisible({ timeout: 20000 })
        await expect(
          second.getByRole('radio', { name: /Apply my device copy/ }),
        ).toBeEnabled()
        await second
          .getByRole('radio', { name: /Apply my device copy/ })
          .check()
        await second
          .getByRole('button', {
            name: 'Queue reviewed device copy',
            exact: true,
          })
          .click()
      }
      await expect(synced(second)).toBeVisible({ timeout: 20000 })
      await expect(second.getByLabel('Additional observations')).toHaveValue(
        choice === 'device' ? 'Copy from inspector B' : 'Copy from inspector A',
      )
      await second.getByText(/Previous review copies \(/).click()
      await expect(
        second
          .getByRole('button', { name: 'Download a copy', exact: true })
          .first(),
      ).toBeVisible()
      expect(
        await second.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      await second.reload()
      await open(second)
      await expect(second.getByLabel('Additional observations')).toHaveValue(
        choice === 'device' ? 'Copy from inspector B' : 'Copy from inspector A',
      )
      if (choice === 'device') {
        await page
          .getByRole('button', {
            name: 'Refresh downloaded assignments',
            exact: true,
          })
          .click()
        await expect(page.getByLabel('Additional observations')).toHaveValue(
          'Copy from inspector B',
        )
      }
    } finally {
      await context.setOffline(false)
      await other.close()
      execFileSync(
        process.execPath,
        ['scripts/browser-fixture.mjs', 'delete', fixture.id],
        { windowsHide: true },
      )
    }
  })
}
