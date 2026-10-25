/* global window */
// Disposable browser contexts and fictional data only; results stay ignored.
import { build, preview } from 'vite'
import { chromium, devices } from '@playwright/test'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
const label = process.argv[2] ?? 'current'
if (!/^[a-z-]+$/.test(label)) throw new Error('Use a simple measurement label')
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } })
const browser = await chromium.launch()
try {
  const result = { label, measuredAt: new Date().toISOString(), environment: 'Local Chromium, no CPU/network throttling, fresh contexts', ui: {}, bundles: [] }
  for (const [name, device] of [['desktop', devices['Desktop Chrome']], ['mobile', devices['Pixel 7']]]) {
    const startup = [], saves = [], paints = []
    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext(device)
      const page = await context.newPage()
      const start = performance.now()
      await page.goto('http://127.0.0.1:4175/fieldnest/')
      await page.getByRole('button', { name: 'Try Fieldnest' }).waitFor()
      startup.push(performance.now() - start)
      paints.push(await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null))
      await page.getByRole('button', { name: 'Try Fieldnest' }).click()
      await page.getByRole('link', { name: /12 Willow Court/ }).click()
      const saveStart = performance.now()
      await page.getByRole('group', { name: 'Walls and ceilings are in good condition' }).getByRole('radio', { name: 'Pass', exact: true }).check()
      await page.getByRole('status').filter({ hasText: /^Saved on this device/ }).waitFor()
      saves.push(performance.now() - saveStart)
      await context.close()
    }
    result.ui[name] = { samples: 3, readyMedianMs: median(startup), saveInteractionMedianMs: median(saves), firstPaintMedianMs: median(paints.filter((v) => v !== null)) }
  }
  const bundled = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: false, lib: { entry: resolve('src/sync/database.ts'), name: 'FieldnestBench', formats: ['iife'] } } })
  const output = Array.isArray(bundled) ? bundled[0] : bundled
  const code = output.output.find((part) => part.type === 'chunk').code
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4175/fieldnest/')
  await page.addScriptTag({ content: code })
  result.queue = await page.evaluate(async () => {
    const db = new window.FieldnestBench.ConnectedDatabase(crypto.randomUUID(), 'disposable-measurement')
    try {
      await db.open()
      await db.operations.bulkAdd(Array.from({ length: 1000 }, () => ({
        id: crypto.randomUUID(), inspectionId: crypto.randomUUID(), baseVersion: 1, revision: 1,
        payload: { answers: {}, notes: 'x'.repeat(5000), status: 'draft' },
        attempts: 1, nextAttempt: Date.now() + 3600000, leaseUntil: 0, blocked: false,
      })))
      const samples = []
      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        const operation = await db.claim('measurement', Date.now())
        if (operation) throw new Error('Fixture unexpectedly eligible')
        samples.push(performance.now() - start)
      }
      samples.sort((a, b) => a - b)
      return { records: 1000, noteBytesEach: 5000, samples: 20, idleClaimMedianMs: samples[10], idleClaimP95Ms: samples[18] }
    } finally { await db.delete() }
  })
  await context.close()
  for (const name of await readdir('dist/assets')) {
    if (!name.endsWith('.js')) continue
    const content = await readFile(`dist/assets/${name}`)
    result.bundles.push({ name, bytes: content.length, gzipBytes: gzipSync(content).length })
  }
  await mkdir('.local/m6', { recursive: true })
  await writeFile(`.local/m6/${label}.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
