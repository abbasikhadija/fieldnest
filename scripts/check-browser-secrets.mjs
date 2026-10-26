import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
let files = 0
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) { await check(path); continue }
    if (!/\.(?:js|css|html|json|webmanifest|tsx?|sql)$/.test(path)) continue
    if (/\.test\.tsx$/.test(path)) continue
    const content = await readFile(path, 'utf8')
    files++
    if (/sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(content))
      throw new Error(`Privileged credential pattern found in ${path}; content suppressed`)
    for (const match of content.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
      let payload
      try { payload = JSON.parse(Buffer.from(match[1], 'base64url').toString()) } catch { continue }
      if (payload.role === 'service_role') throw new Error(`Privileged JWT found in ${path}; content suppressed`)
    }
  }
}
await check('src')
await check('public')
await check('dist')
console.log(`PASS privileged-credential pattern check across ${files} browser source/build files (not a comprehensive secret audit)`)
