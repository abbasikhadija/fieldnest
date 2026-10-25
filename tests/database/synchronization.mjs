import pg from 'pg'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
export async function verifySynchronization(client) {
  const inspection = '10000000-0000-4000-8000-000000000001'
  const actor = '20000000-0000-4000-8000-000000000001'
  const other = '20000000-0000-4000-8000-000000000002'
  const payload = {
    answers: { walls: 'pass' },
    notes: 'durable',
    status: 'draft',
  }
  const call = async (id, base = 1, body = payload, target = inspection) =>
    (
      await client.query(
        'select public.apply_inspection_operation($1,$2,$3,$4) as result',
        [id, target, base, body],
      )
    ).rows[0].result
  const as = async (user = actor) => {
    await client.query('set local role authenticated')
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ])
  }
  let count = 0
  const test = async (name, action) => {
    await client.query('begin')
    try {
      await action()
      console.log(`PASS ${name}`)
      count++
    } finally {
      await client.query('rollback')
    }
  }
  await test('accepted operation replay returns identical receipt without a second update', async () => {
    await as()
    const id = randomUUID()
    const accepted = await call(id)
    assert.equal(accepted.kind, 'accepted')
    assert.equal(accepted.record.version, 2)
    assert.deepEqual(await call(id), accepted)
    assert.equal(
      (
        await client.query(
          'select version from public.inspection_records where inspection_id=$1',
          [inspection],
        )
      ).rows[0].version,
      2,
    )
  })
  await test('different authorized device retrieves completed offline payload', async () => {
    await as()
    const complete = {
      ...payload,
      status: 'completed',
      answers: Object.fromEntries(
        [
          'walls',
          'floors',
          'kitchen',
          'water',
          'bathroom',
          'leaks',
          'electrical',
          'alarm',
        ].map((key) => [key, 'na']),
      ),
    }
    const accepted = await call(randomUUID(), 1, complete)
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      other,
    ])
    const record = (
      await client.query(
        'select * from public.inspection_records where inspection_id=$1',
        [inspection],
      )
    ).rows[0]
    assert.equal(record.status, 'completed')
    assert.deepEqual(record.answers, complete.answers)
    assert.equal(record.version, accepted.record.version)
  })
  await test('stale writers preserve current record and receive stable conflict receipt', async () => {
    await as()
    await call(randomUUID())
    const id = randomUUID()
    const conflict = await call(id, 1, { ...payload, notes: 'second device' })
    assert.equal(conflict.kind, 'conflict')
    assert.equal(conflict.record.notes, 'durable')
    assert.deepEqual(
      await call(id, 1, { ...payload, notes: 'second device' }),
      conflict,
    )
  })
  await test('payload mismatch on reused identifier is rejected', async () => {
    await as()
    const id = randomUUID()
    await call(id)
    await assert.rejects(
      call(id, 1, { ...payload, notes: 'different' }),
      (error) => error.code === '22023',
    )
  })
  await test('authorization is rechecked for receipt replay after revocation', async () => {
    await as()
    const id = randomUUID()
    await call(id)
    await client.query('reset role')
    await client.query(
      'delete from public.inspection_assignments where inspection_id=$1 and user_id=$2',
      [inspection, actor],
    )
    await as()
    await assert.rejects(call(id), (error) => error.code === '42501')
  })
  for (const [name, body] of [
    ['invalid answers', { ...payload, answers: { walls: 'maybe' } }],
    ['missing notes', { answers: {}, status: 'draft' }],
    ['unknown field', { ...payload, extra: true }],
    ['null status', { ...payload, status: null }],
    ['incomplete completion', { ...payload, status: 'completed' }],
  ]) {
    await test(`RPC rejects ${name} atomically`, async () => {
      await as()
      await assert.rejects(
        call(randomUUID(), 1, body),
        (error) => error.code === '22023' || error.code === '23514',
      )
    })
  }
  await test('transaction rollback removes mutation and receipt together', async () => {
    await as()
    const id = randomUUID()
    await client.query('savepoint before_operation')
    await call(id)
    await client.query('rollback to savepoint before_operation')
    const accepted = await call(id)
    assert.equal(accepted.record.version, 2)
  })
  await test('anonymous RPC denied', async () => {
    await client.query('set local role anon')
    await assert.rejects(call(randomUUID()), (error) => error.code === '42501')
  })
  await test('a reviewed local copy uses a new operation and current server version', async () => {
    await as()
    await call(randomUUID())
    await as(other)
    const conflictedId = randomUUID()
    const local = { ...payload, notes: 'Reviewed second inspector copy' }
    const conflict = await call(conflictedId, 1, local)
    const resolution = await call(randomUUID(), conflict.record.version, local)
    assert.equal(resolution.kind, 'accepted')
    assert.equal(resolution.record.version, 3)
    assert.equal(resolution.record.notes, local.notes)
    assert.deepEqual(await call(conflictedId, 1, local), conflict)
  })
  await test('a server edit after review conflicts again instead of being overwritten', async () => {
    await as()
    await call(randomUUID())
    await as(other)
    const local = { ...payload, notes: 'Retained resolution' }
    const reviewed = await call(randomUUID(), 1, local)
    await as()
    await call(randomUUID(), 2, { ...payload, notes: 'Changed during review' })
    await as(other)
    const rejected = await call(randomUUID(), reviewed.record.version, local)
    assert.equal(rejected.kind, 'conflict')
    assert.equal(rejected.record.notes, 'Changed during review')
    const accepted = await call(randomUUID(), rejected.record.version, local)
    assert.equal(accepted.kind, 'accepted')
    assert.equal(accepted.record.version, 4)
    assert.equal(accepted.record.notes, local.notes)
  })
  const connections = [
    new pg.Client(client.connectionParameters),
    new pg.Client(client.connectionParameters),
  ]
  try {
    for (const connection of connections) {
      await connection.connect()
      await connection.query('set role authenticated')
      await connection.query(
        "select set_config('request.jwt.claim.sub',$1,false)",
        [actor],
      )
    }
    const id = randomUUID()
    const args = [id, inspection, 1, payload]
    const results = await Promise.all(
      connections.map((connection) =>
        connection.query(
          'select public.apply_inspection_operation($1,$2,$3,$4) as result',
          args,
        ),
      ),
    )
    assert.deepEqual(results[0].rows[0], results[1].rows[0])
    assert.equal(results[0].rows[0].result.record.version, 2)
    console.log('PASS concurrent duplicate deliveries commit exactly once')
    count++
    const writes = await Promise.all(
      connections.map((connection) =>
        connection.query(
          'select public.apply_inspection_operation($1,$2,$3,$4) as result',
          [randomUUID(), inspection, 2, payload],
        ),
      ),
    )
    assert.deepEqual(
      writes.map((result) => result.rows[0].result.kind).sort(),
      ['accepted', 'conflict'],
    )
    console.log(
      'PASS simultaneous distinct writers cannot overwrite a newer version',
    )
    count++
    await connections[1].query(
      "select set_config('request.jwt.claim.sub',$1,false)",
      [other],
    )
    const resolutions = await Promise.all(
      connections.map((connection, index) =>
        connection.query(
          'select public.apply_inspection_operation($1,$2,$3,$4) as result',
          [
            randomUUID(),
            inspection,
            3,
            { ...payload, notes: `Reviewed copy ${index}` },
          ],
        ),
      ),
    )
    assert.deepEqual(
      resolutions.map((result) => result.rows[0].result.kind).sort(),
      ['accepted', 'conflict'],
    )
    assert.ok(
      resolutions.every((result) => result.rows[0].result.record.version === 4),
    )
    console.log(
      'PASS two authorized concurrent resolution attempts cannot silently overwrite each other',
    )
    count++
  } finally {
    await Promise.all(connections.map((connection) => connection.end()))
  }
  console.log(`${count} PostgreSQL synchronization tests passed`)
}
