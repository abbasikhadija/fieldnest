import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { verifySynchronization } from '../tests/database/synchronization.mjs'
import { verifyAuthorization } from '../tests/database/authorization.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = (relative) => readFile(path.join(root, relative), 'utf8')
const run = (exe, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve(output)
        : reject(
            new Error(`${path.basename(exe)} failed (${code}): ${output}`),
          ),
    )
  })
const unusedPort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
let temporaryDirectory
let pgctl
let client
try {
  let connectionString = process.env.FIELDNEST_TEST_DATABASE_URL
  if (connectionString) {
    const target = new URL(connectionString)
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/fieldnest_test'
    ) {
      throw new Error(
        'Refusing non-local or non-test database. Use a fresh local database named fieldnest_test.',
      )
    }
  } else {
    const binaryDirectory =
      process.env.PG_BIN ??
      (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '')
    const binary = (name) =>
      path.join(
        binaryDirectory,
        `${name}${process.platform === 'win32' ? '.exe' : ''}`,
      )
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'fieldnest-pg-'))
    const data = path.join(temporaryDirectory, 'data')
    pgctl = binary('pg_ctl')
    await run(binary('initdb'), [
      '-D',
      data,
      '-U',
      'fieldnest_test_admin',
      '-A',
      'trust',
      '--encoding=UTF8',
      '--no-locale',
    ])
    const port = await unusedPort()
    await run(pgctl, [
      '-D',
      data,
      '-l',
      path.join(temporaryDirectory, 'postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ])
    const admin = new pg.Client({
      host: '127.0.0.1',
      port,
      user: 'fieldnest_test_admin',
      database: 'postgres',
    })
    await admin.connect()
    try {
      await admin.query('create database fieldnest_test')
    } finally {
      await admin.end()
    }
    connectionString = `postgresql://fieldnest_test_admin@127.0.0.1:${port}/fieldnest_test`
  }
  client = new pg.Client({ connectionString })
  await client.connect()
  console.log(
    `Testing real PostgreSQL ${(await client.query('show server_version')).rows[0].server_version}`,
  )
  await client.query(await read('tests/database/bootstrap.sql'))
  await client.query(
    await read('supabase/migrations/20261025000100_inspection_foundation.sql'),
  )
  await client.query(
    await read('supabase/migrations/20261025000200_durable_sync.sql'),
  )
  await client.query(await read('supabase/seed.sql'))
  await verifyAuthorization(client)
  await verifySynchronization(client)
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Database integration tests failed',
  )
  process.exitCode = 1
} finally {
  if (client) await client.end()
  if (temporaryDirectory) {
    let stopped = false
    try {
      await run(pgctl, [
        '-D',
        path.join(temporaryDirectory, 'data'),
        '-m',
        'fast',
        '-w',
        'stop',
      ])
      stopped = true
    } catch {
      console.error(
        'Could not stop temporary PostgreSQL; temporary files retained for inspection.',
      )
      process.exitCode = 1
    }
    // Only remove the exact directory created by mkdtemp, after shutdown.
    if (
      stopped &&
      path.dirname(path.resolve(temporaryDirectory)) ===
        path.resolve(tmpdir()) &&
      path.basename(temporaryDirectory).startsWith('fieldnest-pg-')
    ) {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  }
}
