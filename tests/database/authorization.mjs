import assert from 'node:assert/strict'

const first = '10000000-0000-4000-8000-000000000001'
const second = '10000000-0000-4000-8000-000000000002'
const userA = '20000000-0000-4000-8000-000000000001'
const userB = '20000000-0000-4000-8000-000000000002'
const userC = '20000000-0000-4000-8000-000000000003'

export async function verifyAuthorization(client) {
  let count = 0
  const test = async (name, operation) => {
    await client.query('begin')
    try {
      await operation()
      console.log(`PASS ${name}`)
      count++
    } finally {
      await client.query('rollback')
    }
  }
  const as = async (role, user) => {
    assert.ok(['anon', 'authenticated', 'service_role'].includes(role))
    await client.query(`set local role ${role}`)
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      user ?? '',
    ])
  }
  const rejects = async (sql, values, code) => {
    await assert.rejects(
      client.query(sql, values),
      (error) => error.code === code,
    )
  }
  await client.query(
    `insert into public.inspection_assignments(inspection_id,user_id) values ($1,$3),($1,$4),($2,$5)`,
    [first, second, userA, userB, userC],
  )
  for (const [user, expected] of [
    [userA, first],
    [userB, first],
    [userC, second],
  ]) {
    await test(`assignee ${user.slice(-1)} sees only authorized property and record`, async () => {
      await as('authenticated', user)
      assert.deepEqual(
        (await client.query('select id from public.inspections')).rows,
        [{ id: expected }],
      )
      assert.deepEqual(
        (
          await client.query(
            'select inspection_id from public.inspection_records',
          )
        ).rows,
        [{ inspection_id: expected }],
      )
      assert.deepEqual(
        (
          await client.query(
            'select user_id from public.inspection_assignments',
          )
        ).rows,
        [{ user_id: user }],
      )
    })
  }
  await test('authenticated identity without assignments sees nothing', async () => {
    await as('authenticated', '20000000-0000-4000-8000-999999999999')
    assert.equal(
      (await client.query('select * from public.inspections')).rowCount,
      0,
    )
    assert.equal(
      (await client.query('select * from public.inspection_records')).rowCount,
      0,
    )
  })
  await test('missing JWT identity grants no rows', async () => {
    await as('authenticated')
    assert.equal(
      (await client.query('select * from public.inspections')).rowCount,
      0,
    )
  })
  await test('anonymous access is denied', async () => {
    await as('anon')
    await rejects('select * from public.inspections', [], '42501')
  })
  for (const [label, sql, args] of [
    [
      'self assignment',
      'insert into public.inspection_assignments(inspection_id,user_id) values($1,$2)',
      [second, userA],
    ],
    [
      'record overwrite',
      'update public.inspection_records set notes=$1 where inspection_id=$2',
      ['forged', first],
    ],
    [
      'record delete',
      'delete from public.inspection_records where inspection_id=$1',
      [first],
    ],
    [
      'property injection',
      "insert into public.inspections(property,address,kind) values('Forged','Secret','Move-in inspection')",
      [],
    ],
  ]) {
    await test(`client cannot perform ${label}`, async () => {
      await as('authenticated', userA)
      await rejects(sql, args, '42501')
    })
  }
  for (const [label, answers] of [
    ['unknown key', { unknown: 'pass' }],
    ['invalid answer', { walls: 'maybe' }],
    ['array', []],
    ['JSON null', null],
  ]) {
    await test(`database rejects ${label}`, async () => {
      await rejects(
        'update public.inspection_records set answers=$1::jsonb where inspection_id=$2',
        [JSON.stringify(answers), first],
        '23514',
      )
    })
  }
  await test('database rejects oversized observations', async () => {
    await rejects(
      'update public.inspection_records set notes=$1 where inspection_id=$2',
      ['x'.repeat(5001), first],
      '23514',
    )
  })
  await test('database rejects incomplete completion', async () => {
    await rejects(
      "update public.inspection_records set status='completed',completed_at=now() where inspection_id=$1",
      [first],
      '23514',
    )
  })
  await test('valid completed record satisfies all constraints', async () => {
    const answers = Object.fromEntries(
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
    )
    await client.query(
      "update public.inspection_records set answers=$1,status='completed',completed_at=now() where inspection_id=$2",
      [answers, first],
    )
    assert.equal(
      (
        await client.query(
          'select status from public.inspection_records where inspection_id=$1',
          [first],
        )
      ).rows[0].status,
      'completed',
    )
  })
  await test('database rejects nonpositive versions', async () => {
    await rejects(
      'update public.inspection_records set version=0 where inspection_id=$1',
      [first],
      '23514',
    )
  })
  await test('foreign keys reject assignments without a real user', async () => {
    await rejects(
      'insert into public.inspection_assignments(inspection_id,user_id) values($1,$2)',
      [first, '20000000-0000-4000-8000-888888888888'],
      '23503',
    )
  })
  await test('revoking an assignment immediately removes access', async () => {
    await client.query(
      'delete from public.inspection_assignments where inspection_id=$1 and user_id=$2',
      [first, userA],
    )
    await as('authenticated', userA)
    assert.equal(
      (await client.query('select * from public.inspection_records')).rowCount,
      0,
    )
  })
  console.log(`${count} PostgreSQL authorization/constraint tests passed`)
}
