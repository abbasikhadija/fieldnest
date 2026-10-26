import assert from 'node:assert/strict'
const target = new URL(process.env.FIELDNEST_SMOKE_URL ?? 'https://abbasikhadija.github.io/fieldnest/')
assert.equal(target.pathname, '/fieldnest/')
assert.ok(target.protocol === 'https:' || (target.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(target.hostname)))
assert.ok(!target.username && !target.password && !target.search && !target.hash)
async function get(path) {
  const url = new URL(path, target)
  assert.equal(url.origin, target.origin)
  assert.ok(url.pathname.startsWith('/fieldnest/'))
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
      if (response.ok) return response
      if (attempt === 2) throw new Error(`Smoke check failed: ${url.pathname} (${response.status})`)
    } catch (error) {
      if (attempt === 2) throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}
const html = await (await get('./')).text()
assert.match(html, /Fieldnest/)
const expected = process.env.FIELDNEST_EXPECTED_REVISION
const metadata = await (await get(`build-info.json?release=${encodeURIComponent(expected ?? 'local')}`)).json()
assert.equal(typeof metadata.revision, 'string')
if (expected) assert.equal(metadata.revision, expected, 'Pages must serve the exact deployed revision')
const assets = [...html.matchAll(/(?:src|href)="(\/fieldnest\/assets\/[^" ]+)"/g)].map((match) => match[1])
assert.ok(assets.some((asset) => asset.endsWith('.js')))
assert.ok(assets.some((asset) => asset.endsWith('.css')))
for (const asset of assets) await get(asset)
const manifest = await (await get('manifest.webmanifest')).json()
assert.equal(manifest.name, 'Fieldnest')
assert.equal(manifest.id, '/fieldnest/')
assert.equal(manifest.start_url, '/fieldnest/')
assert.equal(manifest.scope, '/fieldnest/')
assert.equal(manifest.display, 'standalone')
for (const size of [192, 512]) {
  const icon = manifest.icons.find((item) => item.sizes === `${size}x${size}`)
  assert.ok(icon)
  const bytes = Buffer.from(await (await get(icon.src)).arrayBuffer())
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(bytes.readUInt32BE(16), size)
  assert.equal(bytes.readUInt32BE(20), size)
}
assert.match(await (await get('sw.js')).text(), /precacheAndRoute/)
console.log('PASS production HTML, subpath JS/CSS, PWA manifest, icon dimensions and service worker')
