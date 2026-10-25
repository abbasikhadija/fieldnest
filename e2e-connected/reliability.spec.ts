import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

for (const failure of ['lost-responses', 'device-storage'] as const) {
  test(`${failure}: retained work recovers without duplicate server effects`, async ({ page, context }) => {
    test.setTimeout(90000)
    const fixture: { id: string; property: string } = JSON.parse(execFileSync(
      process.execPath, ['scripts/browser-fixture.mjs', 'create'],
      { encoding: 'utf8', windowsHide: true },
    ))
    const accounts: { email: string; password: string }[] = JSON.parse(await readFile('.local/accounts.json', 'utf8'))
    const open = async (target: Page) => target.getByRole('button', { name: new RegExp(fixture.property) }).click()
    let other: Page | undefined
    try {
      await page.goto('./#/account')
      await page.getByLabel('Email', { exact: true }).fill(accounts[0].email)
      await page.getByLabel('Password', { exact: true }).fill(accounts[0].password)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await open(page)
      await page.evaluate(async () => { await navigator.serviceWorker.ready })
      await context.setOffline(true)
      await page.getByLabel('Additional observations').fill('M5 retained inspection')
      await expect(page.getByRole('status').filter({ hasText: 'Saved on this device · Waiting to sync' })).toBeVisible()
      if (failure === 'device-storage') {
        await page.evaluate(({ id }) => {
          const original = IDBObjectStore.prototype.put
          IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
            const value = args[0] as { id?: string; state?: string }
            if (this.name === 'records' && value.id === id && value.state === 'synced')
              throw new DOMException('Simulated acknowledgment quota', 'QuotaExceededError')
            return original.apply(this, args)
          }
          Object.assign(window, { restoreRecordPut: () => { IDBObjectStore.prototype.put = original } })
        }, { id: fixture.id })
      }
      let allowResponse = failure === 'device-storage'
      const ids: string[] = []
      const versions: number[] = []
      await context.route('**/rest/v1/rpc/apply_inspection_operation', async (route) => {
        const body = route.request().postDataJSON() as { inspection_id: string; operation_id: string }
        if (body.inspection_id !== fixture.id) return route.continue()
        ids.push(body.operation_id)
        const response = await route.fetch()
        const data = await response.json() as { record: { version: number } }
        versions.push(data.record.version)
        if (!allowResponse) await route.abort('failed')
        else await route.fulfill({ response })
      })
      await context.setOffline(false)
      await open(page)
      if (failure === 'device-storage') {
        await expect(page.getByText('The server response could not be saved on this device.', { exact: false })).toBeVisible()
        await expect(page.getByRole('status').filter({ hasText: 'Synchronized with server' })).toHaveCount(0)
        await expect(page.getByLabel('Additional observations')).toHaveValue('M5 retained inspection')
        await page.evaluate(() => (window as unknown as { restoreRecordPut: () => void }).restoreRecordPut())
      } else {
        await expect.poll(() => versions.length, { timeout: 20000 }).toBeGreaterThanOrEqual(3)
        await context.setOffline(true)
        await page.reload()
        await open(page)
        await expect(page.getByLabel('Additional observations')).toHaveValue('M5 retained inspection')
        allowResponse = true
        await context.setOffline(false)
        await open(page)
        // Two authenticated tabs share the same persistent queue and leases.
        other = await context.newPage()
        await other.goto('./#/account')
        await open(other)
        await other.getByRole('button', { name: 'Sync saved work', exact: true }).click()
      }
      await page.getByRole('button', { name: 'Sync saved work', exact: true }).click()
      // Cross-tab Auth events can remount the account view back at assignments.
      // Reopen the saved record while retaining the same success requirement.
      await expect(async () => {
        const assignment = page.getByRole('button', { name: new RegExp(fixture.property) })
        if (await assignment.isVisible()) await assignment.click()
        await expect(page.getByRole('status').filter({ hasText: 'Synchronized with server' })).toBeVisible()
      }).toPass({ timeout: 20000 }).catch(async (error: unknown) => {
        // Only fictional fixture content; never log Auth tokens or passwords.
        console.info('Recovery state:', await page.locator('main').innerText(), { versions, attempts: ids.length })
        throw error
      })
      expect(new Set(ids).size).toBe(1)
      expect(versions.length).toBeGreaterThanOrEqual(2)
      expect(versions.every((version) => version === 2)).toBe(true)
      await other?.close()
      other = undefined
      await page.reload()
      await open(page)
      await expect(page.getByLabel('Additional observations')).toHaveValue('M5 retained inspection')
      await expect(page.getByRole('status').filter({ hasText: 'Synchronized with server' })).toBeVisible()
    } finally {
      await other?.close()
      await context.setOffline(false)
      execFileSync(process.execPath, ['scripts/browser-fixture.mjs', 'delete', fixture.id], { windowsHide: true })
    }
  })
}
