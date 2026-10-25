import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { localSupabase } from './local-supabase.mjs'

const { admin } = localSupabase()
await mkdir('.local', { recursive: true })
let accounts = []
try {
  accounts = JSON.parse(await readFile('.local/accounts.json', 'utf8'))
} catch {
  /* fresh local fixture */
}
const result = []
for (const letter of ['a', 'b']) {
  let account = accounts.find(
    (value) => value.email === `inspector-${letter}@example.test`,
  )
  const exists =
    account && !(await admin.auth.admin.getUserById(account.id)).error
  if (!exists) {
    const password = `${randomBytes(24).toString('base64url')}aA9!`
    const email = `inspector-${letter}@example.test`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error)
      throw new Error(
        'Could not create local inspector. If this seed already ran, preserve .local/accounts.json or reset only your disposable local Supabase stack.',
      )
    account = { id: data.user.id, email, password }
  }
  result.push(account)
  // Persist each newly generated credential immediately, so an interrupted seed
  // can resume without resetting an existing test user's password.
  await writeFile(
    '.local/accounts.json',
    JSON.stringify(
      [
        ...result,
        ...accounts.filter(
          (value) => !result.some((saved) => saved.email === value.email),
        ),
      ],
      null,
      2,
    ),
    { mode: 0o600 },
  )
  const { error } = await admin
    .from('inspection_assignments')
    .upsert({
      inspection_id: '10000000-0000-4000-8000-000000000001',
      user_id: account.id,
    })
  if (error)
    throw new Error(
      'Could not assign local fixture. Apply the checked-in migrations and seed first.',
    )
}
console.log(
  'Two local-only inspectors share Willow Court. Credentials are in ignored .local/accounts.json. Never publish this file or use these fixtures in production.',
)
