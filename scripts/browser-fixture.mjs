// Invoked by connected browser tests; accepts only a disposable loopback stack.
import { localSupabase } from './local-supabase.mjs'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const { admin } = localSupabase()
const id = process.argv[3]
if (process.argv[2] === 'delete' && /^[0-9a-f-]{36}$/.test(id ?? '')) {
  const { error } = await admin.from('inspections').delete().eq('id', id)
  if (error) throw new Error('Could not remove browser fixture')
} else if (process.argv[2] === 'create') {
  const accounts = JSON.parse(await readFile('.local/accounts.json', 'utf8'))
  const fixture = {
    id: randomUUID(),
    property: `Sync test ${randomUUID().slice(0, 8)}`,
    address: 'Fictional test property',
    kind: 'Routine condition inspection',
  }
  for (const result of [
    await admin.from('inspections').insert(fixture),
    await admin
      .from('inspection_records')
      .insert({ inspection_id: fixture.id }),
    await admin
      .from('inspection_assignments')
      .insert(
        accounts.map((account) => ({
          inspection_id: fixture.id,
          user_id: account.id,
        })),
      ),
  ]) {
    if (result.error) throw new Error('Could not create browser fixture')
  }
  console.log(JSON.stringify(fixture))
} else throw new Error('Expected create or delete with fixture UUID')
