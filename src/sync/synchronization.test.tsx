import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectedDatabase, type Acknowledgment } from './database'
import { SyncFailure, SyncWorker } from './worker'
import type { RemoteInspection, RemoteRecord } from '../remote/database.types'
const inspection: RemoteInspection = {
  id: '10000000-0000-4000-8000-000000000001',
  property: 'Willow Court',
  address: '12 Willow Court',
  kind: 'Routine condition inspection',
  due_on: null,
  created_at: '2026-10-25T00:00:00Z',
}
const record: RemoteRecord = {
  inspection_id: inspection.id,
  answers: {},
  notes: '',
  status: 'draft',
  version: 1,
  updated_at: inspection.created_at,
  completed_at: null,
}
const databases: ConnectedDatabase[] = []
const database = (account = crypto.randomUUID()) => {
  const db = new ConnectedDatabase(account, 'test-project')
  databases.push(db)
  return db
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})
const draft = (notes = 'device draft') => ({
  answers: { walls: 'pass' as const },
  notes,
  status: 'draft' as const,
})
const accepted = (notes = 'device draft'): Acknowledgment => ({
  kind: 'accepted',
  record: { ...record, ...draft(notes), version: 2 },
})
describe('durable connected synchronization', () => {
  it('uses the durable operation revision when finalizing a receipt', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const claimed = (await db.claim('tab', 0))!
    await db.acknowledge({ ...claimed, revision: 0 }, accepted())
    expect(await db.operations.count()).toBe(0)
    expect((await db.records.get(inspection.id))?.state).toBe('synced')
  })
  it('rejects an operation identity mismatch without dropping queued work', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const claimed = (await db.claim('tab', 0))!
    await expect(
      db.acknowledge(
        { ...claimed, inspectionId: crypto.randomUUID() },
        accepted(),
      ),
    ).rejects.toThrow('Invalid operation identity')
    expect(await db.operations.count()).toBe(1)
  })
  it('retains work when a conflict receipt moves the server version backwards', async () => {
    const db = database()
    await db.cache(inspection, { ...record, version: 3 })
    await db.save(inspection.id, 1, draft())
    const claimed = (await db.claim('tab', 0))!
    await expect(
      db.acknowledge(claimed, {
        kind: 'conflict',
        record: { ...record, version: 2 },
      }),
    ).rejects.toThrow('Invalid server acknowledgment')
    expect(await db.operations.count()).toBe(1)
    expect((await db.records.get(inspection.id))?.record.version).toBe(3)
  })
  it('accepts equal answer values regardless of JSON object key ordering', async () => {
    const db = database()
    await db.cache(inspection, record)
    const payload = {
      ...draft(),
      answers: { walls: 'pass' as const, floors: 'fail' as const },
    }
    await db.save(inspection.id, 1, payload)
    const operation = (await db.claim('tab', 0))!
    await db.acknowledge(operation, {
      kind: 'accepted',
      record: {
        ...record,
        ...payload,
        answers: { floors: 'fail', walls: 'pass' },
        version: 2,
      },
    })
    expect(await db.operations.count()).toBe(0)
    expect((await db.records.get(inspection.id))?.state).toBe('synced')
  })

  it.each(['notes', 'answers', 'status'] as const)(
    'rejects an accepted acknowledgment with mismatched %s without clearing the durable queue',
    async (field) => {
      const db = database()
      await db.cache(inspection, record)
      const payload = draft()
      if (field === 'status')
        payload.answers = Object.fromEntries(
          [
            'walls',
            'floors',
            'kitchen',
            'water',
            'bathroom',
            'leaks',
            'electrical',
            'alarm',
          ].map((key) => [key, 'pass']),
        ) as typeof payload.answers
      await db.save(inspection.id, 1, payload)
      const operation = (await db.claim('tab', 0))!
      const response: Acknowledgment = {
        kind: 'accepted',
        record: { ...record, ...payload, version: 2 },
      }
      if (field === 'notes') response.record.notes = 'Different operation'
      else if (field === 'answers') response.record.answers = { walls: 'fail' }
      else {
        response.record.status = 'completed'
        response.record.completed_at = record.updated_at
      }
      await expect(db.acknowledge(operation, response)).rejects.toThrow(
        'Invalid server acknowledgment',
      )
      expect(await db.operations.get(operation.id)).toBeDefined()
      expect((await db.records.get(inspection.id))?.record.notes).toBe(
        'device draft',
      )
      expect((await db.records.get(inspection.id))?.dirty).toBe(true)
    },
  )
  it('rolls back the connected record if atomic outbox creation fails', async () => {
    const db = database()
    await db.cache(inspection, record)
    const failure = () => {
      throw new Error('Outbox storage failed')
    }
    db.operations.hook('creating', failure)
    await expect(db.save(inspection.id, 1, draft())).rejects.toThrow(
      'Outbox storage failed',
    )
    expect((await db.records.get(inspection.id))?.record).toEqual(record)
    expect((await db.records.get(inspection.id))?.revision).toBe(1)
    expect(await db.operations.count()).toBe(0)
    db.operations.hook('creating').unsubscribe(failure)
    await db.save(inspection.id, 1, draft())
    expect(await db.operations.count()).toBe(1)
  })
  it('sends at most ten operations per pass and resumes unrelated pending records', async () => {
    const db = database()
    for (let index = 0; index < 11; index++) {
      const id = crypto.randomUUID()
      await db.cache({ ...inspection, id }, { ...record, inspection_id: id })
      await db.save(id, 1, draft())
    }
    const sent: string[] = []
    const worker = new SyncWorker(
      db,
      async (op) => {
        sent.push(op.id)
        return {
          kind: 'accepted',
          record: {
            ...record,
            ...op.payload,
            inspection_id: op.inspectionId,
            version: op.baseVersion + 1,
          },
        }
      },
      () => true,
    )
    await worker.run()
    expect(sent).toHaveLength(10)
    expect(await db.operations.count()).toBe(1)
    await worker.run()
    expect(sent).toHaveLength(11)
    expect(await db.operations.count()).toBe(0)
  })
  it('a restarted worker replays an interrupted claimed operation after lease expiry', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const interrupted = (await db.claim('closed-tab', 0))!
    db.close()
    await db.open()
    const send = vi.fn(async (operation: import('./database').Operation) =>
      accepted(operation.payload.notes),
    )
    const worker = new SyncWorker(
      db,
      send,
      () => true,
      () => 45_000,
    )
    await worker.run()
    expect(send.mock.calls[0][0].id).toBe(interrupted.id)
    expect(await db.operations.count()).toBe(0)
    expect((await db.records.get(inspection.id))?.state).toBe('synced')
  })
  it('persists capped exponential backoff and jitter without changing the operation ID', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    let now = 0,
      id = ''
    for (let attempt = 1; attempt <= 10; attempt++) {
      const operation = (await db.claim('tab', now))!
      if (!id) id = operation.id
      expect(operation.id).toBe(id)
      await db.fail(operation, 'Retry later', false, now, 1)
      const queued = (await db.operations.get(id))!
      expect(queued.nextAttempt - now).toBe(
        Math.min(60000, 1000 * 2 ** (attempt - 1)) * 1.25,
      )
      expect(queued.attempts).toBe(attempt)
      now = queued.nextAttempt
    }
  })

  it('times out stalled requests and keeps the operation retryable', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let sent!: () => void
    const started = new Promise<void>((resolve) => {
      sent = resolve
    })
    const worker = new SyncWorker(
      db,
      async () => {
        sent()
        return new Promise<Acknowledgment>(() => {})
      },
      () => true,
      () => 0,
      () => 0,
    )
    try {
      const running = worker.run()
      await started
      await vi.advanceTimersByTimeAsync(20_000)
      await running
      const op = (await db.operations.toArray())[0]
      expect(op.attempts).toBe(1)
      expect(op.leaseUntil).toBe(0)
      expect(op.nextAttempt).toBe(1000)
    } finally {
      vi.useRealTimers()
    }
  })
  it('explicit retry preserves operation identity but never restarts conflicts', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const operation = (await db.claim('tab', 0))!
    await db.fail(operation, 'Access unavailable', true, 0, 0)
    await db.retryBlocked()
    expect((await db.claim('retry', 1))?.id).toBe(operation.id)
    await db.acknowledge(operation, {
      kind: 'conflict',
      record: { ...record, version: 2 },
    })
    await db.retryBlocked()
    expect(await db.claim('retry', 100000)).toBeNull()
  })

  it('atomically saves a stable snapshot and recovers it through another connection', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const first = await db.operations.toArray()
    db.close()
    await db.open()
    expect(await db.operations.toArray()).toEqual(first)
    expect((await db.records.get(inspection.id))?.state).toBe('pending')
    await expect(db.save(inspection.id, 1, draft('stale tab'))).rejects.toThrow(
      'another tab',
    )
    expect(await db.operations.count()).toBe(1)
  })
  it('isolates accounts and preserves pending work on downloads', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    await db.cache(inspection, {
      ...record,
      notes: 'server overwrite',
      version: 4,
    })
    expect((await db.records.get(inspection.id))?.record.notes).toBe(
      'device draft',
    )
    expect(await database().records.count()).toBe(0)
  })
  it('keeps immutable in-flight payload and queues newer edits against acknowledgment', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const operation = (await db.claim('tab', 0))!
    await db.save(inspection.id, 2, draft('newer'))
    expect((await db.operations.get(operation.id))?.payload.notes).toBe(
      'device draft',
    )
    await db.acknowledge(operation, accepted())
    const next = (await db.operations.toArray())[0]
    expect(next.id).not.toBe(operation.id)
    expect(next.baseVersion).toBe(2)
    expect(next.payload.notes).toBe('newer')
    expect((await db.records.get(inspection.id))?.state).toBe('pending')
  })
  it('retries lost acknowledgments with the same ID and persists acceptance before cleanup', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    let now = 0
    const ids: string[] = []
    const worker = new SyncWorker(
      db,
      async (op) => {
        ids.push(op.id)
        if (ids.length === 1) throw new Error('lost response after commit')
        return accepted()
      },
      () => true,
      () => now,
      () => 0,
    )
    await worker.run()
    expect(await db.operations.count()).toBe(1)
    now = 1000
    await worker.run()
    expect(ids[1]).toBe(ids[0])
    expect(await db.operations.count()).toBe(0)
    expect((await db.records.get(inspection.id))?.state).toBe('synced')
  })
  it('rolls back acknowledgment failure and retains replayable operation', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const operation = (await db.claim('tab', 0))!
    db.records.hook('updating', () => {
      throw new Error('quota')
    })
    await expect(db.acknowledge(operation, accepted())).rejects.toThrow('quota')
    expect(await db.operations.count()).toBe(1)
    expect((await db.records.get(inspection.id))?.state).toBe('syncing')
  })
  it('leases prevent competing claims and expired leases resume after interruption', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const [a, b] = await Promise.all([db.claim('a', 0), db.claim('b', 0)])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect(await db.claim('restart', 44_999)).toBeNull()
    expect((await db.claim('restart', 45_000))?.id).toBe((a ?? b)?.id)
  })
  it('preserves conflicting local and server snapshots without retrying', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const worker = new SyncWorker(
      db,
      async () => ({
        kind: 'conflict',
        record: { ...record, notes: 'other device', version: 2 },
      }),
      () => true,
    )
    await worker.run()
    const local = await db.records.get(inspection.id)
    expect(local?.record.notes).toBe('device draft')
    expect(local?.remote?.notes).toBe('other device')
    expect(local?.state).toBe('conflict')
    expect(await db.claim('tab', Date.now() + 100_000)).toBeNull()
  })
  it('one permanent failure does not block an unrelated record', async () => {
    const db = database()
    await db.cache(inspection, record)
    await db.save(inspection.id, 1, draft())
    const other = crypto.randomUUID()
    await db.cache(
      { ...inspection, id: other },
      { ...record, inspection_id: other },
    )
    await db.save(other, 1, draft())
    const worker = new SyncWorker(
      db,
      async (op) => {
        if (op.inspectionId === inspection.id)
          throw new SyncFailure('Access removed', true)
        return {
          ...accepted(),
          record: { ...accepted().record, inspection_id: other },
        }
      },
      () => true,
    )
    await worker.run()
    expect((await db.records.get(inspection.id))?.state).toBe('blocked')
    expect((await db.records.get(other))?.state).toBe('synced')
  })
})
