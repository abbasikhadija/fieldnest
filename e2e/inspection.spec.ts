import { test, expect } from '@playwright/test'

test('demo draft survives navigation, offline editing, refresh, completion and restart', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  await page
    .getByRole('group', { name: 'Walls and ceilings are in good condition' })
    .getByRole('radio', { name: 'Fail', exact: true })
    .check()
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: '5. Review' }).click()
  await expect(
    page.getByRole('button', { name: 'Complete inspection', exact: true }),
  ).toBeDisabled()
  await page
    .getByLabel('Additional observations')
    .fill('Crack beside the kitchen window. Arrange a repair.')
  // Navigate immediately: the editor session must outlive its route.
  await page.getByRole('link', { name: 'Activity', exact: true }).click()
  await expect(
    page.getByRole('link', { name: /12 Willow Court/ }),
  ).toBeVisible()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  await page.getByRole('button', { name: '5. Review' }).click()
  await expect(page.getByLabel('Additional observations')).toHaveValue(
    'Crack beside the kitchen window. Arrange a repair.',
  )
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.getByRole('button', { name: '5. Review' }).click()
  await expect(page.getByLabel('Additional observations')).toHaveValue(
    /Crack beside/,
  )
  await context.setOffline(true)
  await page
    .getByLabel('Additional observations')
    .fill('Offline update: repair scheduled.')
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page
      .getByRole('group', { name: 'Walls and ceilings are in good condition' })
      .getByRole('radio', { name: 'Fail', exact: true }),
  ).toBeChecked()
  for (let index = 0; index < 4; index++) {
    const radios = page.getByRole('radio', { name: 'Pass', exact: true })
    await radios.nth(0).check()
    await radios.nth(1).check()
    await page
      .getByRole('button', {
        name: index < 3 ? 'Next section →' : 'Review inspection →',
      })
      .click()
  }
  await expect(page.getByLabel('Additional observations')).toHaveValue(
    'Offline update: repair scheduled.',
  )
  await page
    .getByRole('button', { name: 'Complete inspection', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Completed inspection' }),
  ).toBeVisible()
  await expect(
    page.getByText('Completed locally · Not synchronized'),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Completed inspection' }),
  ).toBeVisible()
  await expect(
    page.getByText('Offline update: repair scheduled.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('another tab cannot overwrite a retained stale draft', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  const second = await context.newPage()
  await second.goto('./#/inspection/willow-court')
  await second.getByRole('button', { name: '5. Review' }).click()
  await second.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'inspections')
        throw new DOMException(
          'Simulated storage failure',
          'QuotaExceededError',
        )
      return original.apply(this, args)
    }
    Object.assign(window, {
      restorePut: () => {
        IDBObjectStore.prototype.put = original
      },
    })
  })
  await second
    .getByLabel('Additional observations')
    .fill('Retained edits from tab two')
  await expect(second.getByRole('button', { name: 'Retry save' })).toBeVisible()
  await page
    .getByRole('group', { name: 'Walls and ceilings are in good condition' })
    .getByRole('radio', { name: 'Pass', exact: true })
    .check()
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toBeVisible()
  await second.evaluate(() =>
    (window as unknown as { restorePut: () => void }).restorePut(),
  )
  await second.getByRole('button', { name: 'Retry save' }).click()
  await expect(
    second.getByText(/This inspection changed in another tab/),
  ).toBeVisible()
  await expect(second.getByLabel('Additional observations')).toHaveValue(
    'Retained edits from tab two',
  )
  const download = second.waitForEvent('download')
  await second.getByRole('button', { name: 'Download a copy' }).click()
  expect((await download).suggestedFilename()).toBe('fieldnest-demo-draft.json')
  await second.getByRole('button', { name: 'Load newer device copy' }).click()
  await second
    .getByRole('button', { name: 'Discard these edits and load device copy' })
    .click()
  await expect(second.getByLabel('Additional observations')).toHaveValue('')
  await second.getByRole('button', { name: '1. General condition' }).click()
  await expect(
    second
      .getByRole('group', { name: 'Walls and ceilings are in good condition' })
      .getByRole('radio', { name: 'Pass', exact: true }),
  ).toBeChecked()
})

test('storage failure preserves edits across routes and supports retry', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try Fieldnest' }).click()
  await page.getByRole('link', { name: /12 Willow Court/ }).click()
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'inspections')
        throw new DOMException('Simulated quota', 'QuotaExceededError')
      return original.apply(this, args)
    }
    Object.assign(window, {
      restorePut: () => {
        IDBObjectStore.prototype.put = original
      },
    })
  })
  await page
    .getByRole('group', { name: 'Walls and ceilings are in good condition' })
    .getByRole('radio', { name: 'Fail', exact: true })
    .check()
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: 'Activity', exact: true }).click()
  await page.getByRole('link', { name: 'Recover 12 Willow Court' }).click()
  await expect(
    page
      .getByRole('group', { name: 'Walls and ceilings are in good condition' })
      .getByRole('radio', { name: 'Fail', exact: true }),
  ).toBeChecked()
  await page.evaluate(() =>
    (window as unknown as { restorePut: () => void }).restorePut(),
  )
  await page.getByRole('button', { name: 'Retry save' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved on this device/ }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page
      .getByRole('group', { name: 'Walls and ceilings are in good condition' })
      .getByRole('radio', { name: 'Fail', exact: true }),
  ).toBeChecked()
})
