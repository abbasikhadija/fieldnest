import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectedDatabase, type CachedInspection, type Operation, type Acknowledgment } from './database'
import { SyncWorker } from './worker'
import { retrySummary } from './status'

const databases: ConnectedDatabase[] = []
async function fixture() {
  const account = crypto.randomUUID()
  const db = new ConnectedDatabase(account, 'reliability')
  databases.push(db)
  const id = crypto.randomUUID()
  const record = { inspection_id: id, answers: {}, notes: '', status: 'draft' as const,
    version: 1, updated_at: '2026-10-26T00:00:00Z', completed_at: null }
  await db.cache({ id, property: 'Fictional recovery', address: 'Test', kind: 'Routine condition inspection',
    due_on: null, created_at: record.updated_at }, record)
  await db.save(id, 1, { answers: {}, notes: 'Retained work', status: 'draft' })
  return { db, id, account }
}
function receipt(op: Operation): Acknowledgment {
  return { kind: 'accepted', record: { ...op.payload, inspection_id: op.inspectionId,
    version: op.baseVersion + 1, updated_at: '2026-10-26T00:00:00Z', completed_at: null } }
}
afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})
describe('M5 failure recovery', () => {
  it('indexed queue selection skips future, blocked and actively leased work', async () => {
    const { db } = await fixture()
    const eligible = (await db.operations.toArray())[0]
    await db.operations.bulkAdd([
      { ...eligible, id: crypto.randomUUID(), inspectionId: crypto.randomUUID(), nextAttempt: 5000 },
      { ...eligible, id: crypto.randomUUID(), inspectionId: crypto.randomUUID(), nextAttempt: -2, blocked: true },
      { ...eligible, id: crypto.randomUUID(), inspectionId: crypto.randomUUID(), nextAttempt: -1, leaseUntil: 45000 },
    ])
    expect((await db.claim('indexed-worker', 0))?.id).toBe(eligible.id)
    expect(await db.claim('second-worker', 0)).toBeNull()
    expect(await db.operations.count()).toBe(4)
  })
  it.each([false, true])('isolates acknowledgment storage failure even if retry metadata also fails: %s', async (metadataFails) => {
    const { db, id } = await fixture()
    const good = (await db.records.get(id))!
    const other = crypto.randomUUID()
    await db.cache({ ...good.inspection, id: other }, { ...good.record, inspection_id: other, notes: '' })
    await db.save(other, 1, { answers: {}, notes: 'Other work', status: 'draft' })
    const operation = (await db.operations.where('inspectionId').equals(id).first())!
    const fail = (changes: Partial<CachedInspection>, key: string) => {
      if (key === id && (changes.state === 'synced' || (metadataFails && changes.state === 'pending')))
        throw new Error('Device quota')
    }
    db.records.hook('updating', fail)
    const worker = new SyncWorker(db, async (op) => receipt(op), () => true, () => 0, () => 0)
    await expect(worker.run()).rejects.toThrow('could not be saved')
    expect((await db.records.get(other))?.state).toBe('synced')
    expect((await db.records.get(id))?.record.notes).toBe('Retained work')
    expect((await db.operations.get(operation.id))?.payload).toEqual(operation.payload)
    db.records.hook('updating').unsubscribe(fail)
    await new SyncWorker(db, async (op) => receipt(op), () => true, () => 45000).run()
    expect(await db.operations.count()).toBe(0)
    expect((await db.records.get(id))?.state).toBe('synced')
  })
  it('explicit retry advances backoff without stealing a live lease or changing the operation', async () => {
    const { db, id } = await fixture()
    const first = (await db.claim('tab', 0))!
    await db.retryBlocked(1)
    expect(await db.claim('other', 1)).toBeNull()
    await db.fail(first, 'Unconfirmed response', false, 10, 0)
    expect(await db.claim('other', 11)).toBeNull()
    await db.retryBlocked(11)
    const retry = (await db.claim('other', 11))!
    expect(retry.id).toBe(first.id)
    expect(retry.payload).toEqual(first.payload)
    expect((await db.records.get(id))?.dirty).toBe(true)
  })
  it('a stale failure cannot release a newer claim even with the same worker identity', async () => {
    const { db } = await fixture()
    const old = (await db.claim('same-tab', 0))!
    const current = (await db.claim('same-tab', 45000))!
    await db.fail(old, 'Late failure', true, 45001, 0)
    expect(await db.operations.get(old.id)).toEqual(current)
  })
  it('two independent storage connections coordinate claims and process a late receipt only once', async () => {
    const { db, account, id } = await fixture()
    const other = new ConnectedDatabase(account, 'reliability')
    try {
      const claims = await Promise.all([db.claim('first', 0), other.claim('second', 0)])
      expect(claims.filter(Boolean)).toHaveLength(1)
      const initial = claims.find(Boolean)!
      const resumed = (await other.claim('resumed', 45000))!
      await db.acknowledge(initial, receipt(initial))
      await other.fail(resumed, 'Late transport failure', false, 45001, 0)
      await other.acknowledge(resumed, receipt(resumed))
      expect(await db.operations.count()).toBe(0)
      expect((await db.records.get(id))?.record.version).toBe(2)
    } finally { other.close() }
  })
  it('does not send a request when stopped during an asynchronous claim', async () => {
    const { db } = await fixture()
    const claim = db.claim.bind(db)
    vi.spyOn(db, 'claim').mockImplementation(async (...args) => {
      const result = await claim(...args)
      worker.stop()
      return result
    })
    const send = vi.fn(async (op: Operation) => receipt(op))
    const worker = new SyncWorker(db, send, () => true, () => 0, () => 0)
    await worker.run()
    expect(send).not.toHaveBeenCalled()
    expect(await db.operations.count()).toBe(1)
    expect((await db.operations.toArray())[0].leaseUntil).toBe(0)
  })
  it('a late conflict replay preserves a refreshed server snapshot', async () => {
    const { db, id } = await fixture()
    const op = (await db.claim('tab', 0))!
    const conflict: Acknowledgment = { kind: 'conflict', record: receipt(op).record }
    await db.acknowledge(op, conflict)
    const current = (await db.records.get(id))!
    await db.refreshConflict(id, current.revision, { ...conflict.record, version: 3, notes: 'New review' })
    await db.acknowledge(op, conflict)
    expect((await db.records.get(id))?.remote?.version).toBe(3)
    expect((await db.records.get(id))?.remote?.notes).toBe('New review')
  })
  it('timeout aborts transport, ignores a late result, and retries the same saved request', async () => {
    const { db, id } = await fixture()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let signal!: AbortSignal
    let finish!: (value: Acknowledgment) => void
    let started!: () => void
    const ready = new Promise<void>((resolve) => { started = resolve })
    const op = (await db.operations.toArray())[0]
    const worker = new SyncWorker(db, (_op, value) => {
      signal = value
      started()
      return new Promise((resolve) => { finish = resolve })
    }, () => true, () => 0, () => 0)
    const running = worker.run()
    await ready
    await vi.advanceTimersByTimeAsync(20000)
    await running
    expect(signal.aborted).toBe(true)
    finish(receipt(op))
    await Promise.resolve()
    expect((await db.records.get(id))?.state).toBe('pending')
    expect((await db.operations.get(op.id))?.attempts).toBe(1)
    await new SyncWorker(db, async (retry) => {
      expect(retry.id).toBe(op.id)
      return receipt(retry)
    }, () => true, () => 1000).run()
    expect((await db.records.get(id))?.state).toBe('synced')
  })
  it('describes offline, backoff, leased and blocked work without claiming acceptance', async () => {
    const { db } = await fixture()
    const records = await db.records.toArray()
    const operation = (await db.operations.toArray())[0]
    expect(retrySummary([operation], records, false, 0)).toContain('Connect to resume')
    expect(retrySummary([{ ...operation, nextAttempt: 60000 }], records, true, 0)).toContain('60 seconds')
    expect(retrySummary([{ ...operation, leaseUntil: 45000 }], records, true, 0)).toContain('Another tab')
    expect(retrySummary([{ ...operation, blocked: true }], [{ ...records[0], state: 'conflict' }], true, 0)).toContain('need review')
    expect(retrySummary([], [], true, 0)).toBe('')
  })
})
