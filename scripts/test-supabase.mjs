import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { localSupabase } from './local-supabase.mjs'

const { admin, anonymous } = localSupabase()
const users = []
const clients = []
let syncFixture
let passed = 0
const check = async (name, operation) => {
  await operation()
  console.log(`PASS ${name}`)
  passed++
}
try {
  const shared = '10000000-0000-4000-8000-000000000001'
  const restricted = '10000000-0000-4000-8000-000000000002'
  for (let index = 0; index < 3; index++) {
    const email = `fieldnest-test-${randomUUID()}@example.test`
    const password = `${randomBytes(24).toString('base64url')}aA9!`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    assert.ifError(error)
    users.push(data.user)
    const client = anonymous()
    clients.push(client)
    await check(`real Auth sign-in for inspector ${index + 1}`, async () => {
      const { data: session, error: loginError } =
        await client.auth.signInWithPassword({ email, password })
      assert.ifError(loginError)
      assert.equal(session.user.id, data.user.id)
      const verified = await client.auth.getUser()
      assert.ifError(verified.error)
      assert.equal(verified.data.user.id, data.user.id)
    })
    const assignment = await admin.from('inspection_assignments').insert({
      inspection_id: index < 2 ? shared : restricted,
      user_id: data.user.id,
    })
    assert.ifError(assignment.error)
  }
  for (let index = 0; index < clients.length; index++) {
    await check(
      `PostgREST RLS for authenticated inspector ${index + 1}`,
      async () => {
        const expected = index < 2 ? shared : restricted
        const properties = await clients[index].from('inspections').select('id')
        assert.ifError(properties.error)
        assert.deepEqual(properties.data, [{ id: expected }])
        const records = await clients[index]
          .from('inspection_records')
          .select('inspection_id')
        assert.ifError(records.error)
        assert.deepEqual(records.data, [{ inspection_id: expected }])
        const forbidden = await clients[index]
          .from('inspection_records')
          .select('*')
          .eq('inspection_id', index < 2 ? restricted : shared)
        assert.ifError(forbidden.error)
        assert.deepEqual(forbidden.data, [])
      },
    )
  }
  await check(
    'authenticated HTTP requests cannot self-assign or overwrite',
    async () => {
      assert.ok(
        (
          await clients[0]
            .from('inspection_assignments')
            .insert({ inspection_id: restricted, user_id: users[0].id })
        ).error,
      )
      assert.ok(
        (
          await clients[0]
            .from('inspection_records')
            .update({ notes: 'forged' })
            .eq('inspection_id', shared)
        ).error,
      )
    },
  )
  await check('anonymous HTTP reads are denied', async () => {
    assert.ok((await anonymous().from('inspections').select('*')).error)
  })
  await check(
    'public email signup is disabled while existing users can sign in',
    async () => {
      const result = await anonymous().auth.signUp({
        email: `blocked-${randomUUID()}@example.test`,
        password: `${randomBytes(24).toString('base64url')}aA9!`,
      })
      if (result.data.user)
        await admin.auth.admin.deleteUser(result.data.user.id)
      assert.ok(result.error, 'Public signup must be rejected')
    },
  )
  await check('wrong passwords are rejected by real Auth', async () => {
    assert.ok(
      (
        await anonymous().auth.signInWithPassword({
          email: users[0].email,
          password: 'incorrect-password',
        })
      ).error,
    )
  })
  await check('real server validation rejects malformed answers', async () => {
    const response = await admin
      .from('inspection_records')
      .insert({ inspection_id: randomUUID(), answers: { walls: 'maybe' } })
    assert.equal(response.error?.code, '23514')
  })
  await check(
    'real RPC retries and second-user retrieval use committed server versions',
    async () => {
      syncFixture = randomUUID()
      assert.ifError(
        (
          await admin.from('inspections').insert({
            id: syncFixture,
            property: 'RPC fixture',
            address: 'Fictional',
            kind: 'Routine condition inspection',
          })
        ).error,
      )
      assert.ifError(
        (
          await admin
            .from('inspection_records')
            .insert({ inspection_id: syncFixture })
        ).error,
      )
      assert.ifError(
        (
          await admin.from('inspection_assignments').insert(
            users.slice(0, 2).map((user) => ({
              inspection_id: syncFixture,
              user_id: user.id,
            })),
          )
        ).error,
      )
      const args = {
        operation_id: randomUUID(),
        inspection_id: syncFixture,
        base_version: 1,
        payload: {
          answers: { walls: 'pass' },
          notes: 'Real HTTP mutation',
          status: 'draft',
        },
      }
      const accepted = await clients[0].rpc('apply_inspection_operation', args)
      assert.ifError(accepted.error)
      assert.equal(accepted.data.kind, 'accepted')
      const retry = await clients[0].rpc('apply_inspection_operation', args)
      assert.ifError(retry.error)
      assert.deepEqual(retry.data, accepted.data)
      const remote = await clients[1]
        .from('inspection_records')
        .select('*')
        .eq('inspection_id', syncFixture)
        .single()
      assert.ifError(remote.error)
      assert.equal(remote.data.version, 2)
      assert.equal(remote.data.notes, 'Real HTTP mutation')
      const conflict = await clients[1].rpc('apply_inspection_operation', {
        ...args,
        operation_id: randomUUID(),
      })
      assert.ifError(conflict.error)
      assert.equal(conflict.data.kind, 'conflict')
      assert.equal(
        (
          await clients[2].rpc('apply_inspection_operation', {
            ...args,
            operation_id: randomUUID(),
          })
        ).error?.code,
        '42501',
      )
    },
  )
  await check(
    'reviewed resolution uses a new version-checked request and preserves conflict replay',
    async () => {
      const body = {
        inspection_id: syncFixture,
        base_version: 2,
        payload: {
          answers: { walls: 'fail' },
          notes: 'Reviewed HTTP copy',
          status: 'draft',
        },
      }
      const first = await clients[1].rpc('apply_inspection_operation', {
        ...body,
        operation_id: randomUUID(),
      })
      assert.ifError(first.error)
      assert.equal(first.data.kind, 'accepted')
      const staleId = randomUUID()
      const stale = await clients[0].rpc('apply_inspection_operation', {
        ...body,
        operation_id: staleId,
      })
      assert.ifError(stale.error)
      assert.equal(stale.data.kind, 'conflict')
      const resolved = await clients[0].rpc('apply_inspection_operation', {
        ...body,
        base_version: stale.data.record.version,
        operation_id: randomUUID(),
        payload: { ...body.payload, notes: 'Resolved after real review' },
      })
      assert.ifError(resolved.error)
      assert.equal(resolved.data.kind, 'accepted')
      assert.equal(resolved.data.record.version, 4)
      const replay = await clients[0].rpc('apply_inspection_operation', {
        ...body,
        operation_id: staleId,
      })
      assert.ifError(replay.error)
      assert.deepEqual(replay.data, stale.data)
      const retrieved = await clients[1]
        .from('inspection_records')
        .select('notes,version')
        .eq('inspection_id', syncFixture)
        .single()
      assert.ifError(retrieved.error)
      assert.deepEqual(retrieved.data, {
        notes: 'Resolved after real review',
        version: 4,
      })
    },
  )
  await check('real Auth sign-out removes this client session', async () => {
    assert.ifError((await clients[0].auth.signOut({ scope: 'local' })).error)
    assert.ok((await clients[0].auth.getUser()).error)
    assert.ok((await clients[0].from('inspections').select('*')).error)
  })
  console.log(`${passed} real Supabase Auth/PostgREST integration tests passed`)
} finally {
  if (syncFixture)
    await admin.from('inspections').delete().eq('id', syncFixture)
  for (const client of clients) await client.auth.signOut({ scope: 'local' })
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('Could not remove a disposable local test user.')
      process.exitCode = 1
    }
  }
}
