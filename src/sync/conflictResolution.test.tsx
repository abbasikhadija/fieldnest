import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ConnectedDatabase,
  type CachedInspection,
  type Operation,
} from './database'
import { compareCopies } from '../domain/conflict'
import { StaleDraftError } from '../persistence/database'
import { SyncWorker } from './worker'
import type { RemoteRecord } from '../remote/database.types'

const record: RemoteRecord = {
  inspection_id: '10000000-0000-4000-8000-000000000001',
  answers: { walls: 'fail' },
  notes: 'Device observations',
  status: 'draft',
  version: 1,
  updated_at: '2026-10-25T00:00:00Z',
  completed_at: null,
}
const server: RemoteRecord = {
  ...record,
  answers: { walls: 'pass' },
  notes: 'Server observations',
  version: 2,
}
const instances: ConnectedDatabase[] = []
async function conflict() {
  const db = new ConnectedDatabase(crypto.randomUUID(), 'conflict-test')
  instances.push(db)
  await db.cache(
    {
      id: record.inspection_id,
      property: 'Fictional',
      address: 'Test',
      kind: 'Move-in inspection',
      due_on: null,
      created_at: record.updated_at,
    },
    { ...record, answers: {}, notes: '' },
  )
  await db.save(record.inspection_id, 1, record)
  const operation = (await db.claim('tab', 0))!
  await db.acknowledge(operation, { kind: 'conflict', record: server })
  return { db, operation, saved: (await db.records.get(record.inspection_id))! }
}
afterEach(async () => {
  await Promise.all(instances.splice(0).map((db) => db.delete()))
})
describe('manual conflict resolution', () => {
  it('compares raw values even when an observation equals the empty placeholder', () => {
    const rows = compareCopies(
      { ...record, notes: '' },
      { ...server, notes: 'No observations' },
    )
    expect(
      rows.find((row) => row.label === 'Additional observations')?.different,
    ).toBe(true)
    expect(
      rows.find(
        (row) => row.label === 'Walls and ceilings are in good condition',
      ),
    ).toMatchObject({ local: 'Fail', server: 'Pass', different: true })
  })
  it('queues a new immutable operation against the reviewed version and archives both copies', async () => {
    const { db, operation, saved } = await conflict()
    await db.resolveConflict(saved.id, saved.revision, server.version, 'device')
    const next = (await db.operations.toArray())[0]
    expect(next.id).not.toBe(operation.id)
    expect(next.baseVersion).toBe(2)
    expect(next.payload.notes).toBe(record.notes)
    expect(await db.operations.get(operation.id)).toBeUndefined()
    expect((await db.records.get(saved.id))?.state).toBe('pending')
    expect((await db.resolutions.toArray())[0]).toMatchObject({
      local: { notes: record.notes },
      server,
      operation: {
        id: operation.id,
        baseVersion: operation.baseVersion,
        payload: operation.payload,
        revision: operation.revision,
        blocked: true,
        leaseUntil: 0,
      },
      choice: 'device',
    })
    expect((await db.resolutions.toArray())[0].operation.owner).toBeUndefined()
    db.close()
    await db.open()
    expect(await db.resolutions.count()).toBe(1)
    expect((await db.operations.toArray())[0].id).toBe(next.id)
  })
  it('adopts only the reviewed server copy and retains device edits in recovery history', async () => {
    const { db, saved } = await conflict()
    await db.resolveConflict(saved.id, saved.revision, 2, 'server')
    expect(await db.operations.count()).toBe(0)
    expect(await db.records.get(saved.id)).toMatchObject({
      state: 'synced',
      dirty: false,
      record: server,
      revision: saved.revision + 1,
    })
    expect((await db.resolutions.toArray())[0].local.notes).toBe(record.notes)
  })
  it('allows only one decision from two stale tabs', async () => {
    const { db, saved } = await conflict()
    const results = await Promise.allSettled([
      db.resolveConflict(saved.id, saved.revision, 2, 'device'),
      db.resolveConflict(saved.id, saved.revision, 2, 'server'),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(await db.resolutions.count()).toBe(1)
  })
  it('requires review again after the displayed server version changes', async () => {
    const { db, saved } = await conflict()
    await db.refreshConflict(saved.id, saved.revision, {
      ...server,
      version: 3,
      notes: 'New update',
    })
    await expect(
      db.resolveConflict(saved.id, saved.revision, 2, 'device'),
    ).rejects.toBeInstanceOf(StaleDraftError)
    expect((await db.records.get(saved.id))?.record.notes).toBe(record.notes)
    expect(await db.resolutions.count()).toBe(0)
  })
  it.each(['resolutions', 'operations'] as const)(
    'rolls back the entire decision if %s creation fails',
    async (table) => {
      const { db, saved, operation } = await conflict()
      const fail = () => {
        throw new Error('Storage full')
      }
      db[table].hook('creating', fail)
      await expect(
        db.resolveConflict(saved.id, saved.revision, 2, 'device'),
      ).rejects.toThrow('Storage full')
      expect(await db.records.get(saved.id)).toEqual(saved)
      expect(await db.operations.get(operation.id)).toEqual({
        ...operation,
        blocked: true,
        owner: undefined,
        leaseUntil: 0,
      })
      expect(await db.resolutions.count()).toBe(0)
      db[table].hook('creating').unsubscribe(fail)
    },
  )
  it('preserves a rejected resolution and its recovery history when the server changed again', async () => {
    const { db, saved } = await conflict()
    await db.resolveConflict(saved.id, saved.revision, 2, 'device')
    const worker = new SyncWorker(
      db,
      async () => ({
        kind: 'conflict',
        record: { ...server, version: 3, notes: 'Concurrent resolution' },
      }),
      () => true,
    )
    await worker.run()
    const again = (await db.records.get(saved.id))!
    expect(again).toMatchObject({
      state: 'conflict',
      record: { notes: record.notes },
      remote: { version: 3 },
    })
    expect(await db.resolutions.count()).toBe(1)
    await db.resolveConflict(again.id, again.revision, 3, 'device')
    expect(await db.resolutions.count()).toBe(2)
    expect((await db.operations.toArray())[0].baseVersion).toBe(3)
  })
  it('does not overwrite a completed server inspection', async () => {
    const { db, saved } = await conflict()
    await db.refreshConflict(saved.id, saved.revision, {
      ...server,
      status: 'completed',
      completed_at: server.updated_at,
      version: 3,
    })
    const current = (await db.records.get(saved.id))!
    await expect(
      db.resolveConflict(current.id, current.revision, 3, 'device'),
    ).rejects.toThrow('completed')
    await db.resolveConflict(current.id, current.revision, 3, 'server')
    expect((await db.records.get(current.id))?.record.status).toBe('completed')
  })
  it('upgrades a v1 cache without losing its records or immutable operations', async () => {
    const account = crypto.randomUUID()
    const name = `fieldnest-connected-${encodeURIComponent('upgrade-test')}-${account}`
    const old = new Dexie(name)
    old.version(1).stores({
      records: 'id, state',
      operations: 'id, &inspectionId, nextAttempt',
    })
    const saved: CachedInspection = {
      id: record.inspection_id,
      inspection: {
        id: record.inspection_id,
        property: 'Old property',
        address: 'Test',
        kind: 'Move-in inspection',
        created_at: record.updated_at,
        due_on: null,
      },
      record,
      revision: 2,
      dirty: true,
      state: 'pending',
    }
    const operation: Operation = {
      id: crypto.randomUUID(),
      inspectionId: saved.id,
      baseVersion: 1,
      revision: 2,
      payload: {
        answers: record.answers,
        notes: record.notes,
        status: 'draft',
      },
      attempts: 0,
      nextAttempt: 0,
      leaseUntil: 0,
      blocked: false,
    }
    await old.table('records').add(saved)
    await old.table('operations').add(operation)
    old.close()
    const upgraded = new ConnectedDatabase(account, 'upgrade-test')
    instances.push(upgraded)
    expect(await upgraded.records.get(saved.id)).toEqual(saved)
    expect(await upgraded.operations.get(operation.id)).toEqual(operation)
    expect(await upgraded.resolutions.count()).toBe(0)
  })
})
