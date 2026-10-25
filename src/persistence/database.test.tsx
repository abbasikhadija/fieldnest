import { afterEach, describe, expect, it } from 'vitest'
import { DemoDatabase, saveDraft, startDemo, StaleDraftError } from './database'
import { questions, type Answers } from '../domain/inspection'
const databases: DemoDatabase[] = []
function database() {
  const instance = new DemoDatabase(`test-${crypto.randomUUID()}`)
  databases.push(instance)
  return instance
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})
describe('local transactions', () => {
  it('seeds atomically and only once, including concurrent startup', async () => {
    const db = database()
    await Promise.all([startDemo(db), startDemo(db)])
    expect(await db.inspections.count()).toBe(3)
    await saveDraft(
      'willow-court',
      0,
      { answers: { walls: 'fail' }, notes: 'Crack near window' },
      false,
      db,
    )
    await startDemo(db)
    expect((await db.inspections.get('willow-court'))?.notes).toBe(
      'Crack near window',
    )
  })
  it('recovers acknowledged drafts after closing and reopening storage', async () => {
    const db = database()
    await startDemo(db)
    await saveDraft(
      'willow-court',
      0,
      { answers: { floors: 'pass' }, notes: 'Keep this draft' },
      false,
      db,
    )
    db.close()
    await db.open()
    expect(await db.inspections.get('willow-court')).toMatchObject({
      revision: 1,
      status: 'draft',
      notes: 'Keep this draft',
      answers: { floors: 'pass' },
    })
  })
  it('rejects stale writes without replacing either saved answers or notes', async () => {
    const db = database()
    await startDemo(db)
    await saveDraft(
      'willow-court',
      0,
      { answers: { walls: 'pass' }, notes: 'First tab' },
      false,
      db,
    )
    await expect(
      saveDraft(
        'willow-court',
        0,
        { answers: { walls: 'fail' }, notes: 'Second tab' },
        false,
        db,
      ),
    ).rejects.toBeInstanceOf(StaleDraftError)
    expect(await db.inspections.get('willow-court')).toMatchObject({
      notes: 'First tab',
      revision: 1,
      answers: { walls: 'pass' },
    })
  })
  it('rolls back record changes when the containing transaction aborts', async () => {
    const db = database()
    await startDemo(db)
    await expect(
      db.transaction('rw', db.inspections, async () => {
        await saveDraft(
          'willow-court',
          0,
          { answers: {}, notes: 'Must roll back' },
          false,
          db,
        )
        throw new Error('Simulated storage failure')
      }),
    ).rejects.toThrow('Simulated storage failure')
    expect(await db.inspections.get('willow-court')).toMatchObject({
      notes: '',
      revision: 0,
    })
  })
  it('validates completion and keeps completed inspections immutable', async () => {
    const db = database()
    await startDemo(db)
    await expect(
      saveDraft('willow-court', 0, { answers: {}, notes: '' }, true, db),
    ).rejects.toThrow('Answer every')
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, 'pass']),
    ) as Answers
    const saved = await saveDraft(
      'willow-court',
      0,
      { answers, notes: 'Reviewed' },
      true,
      db,
    )
    expect(saved.status).toBe('completed')
    expect(saved.completedAt).toBeTruthy()
    await expect(
      saveDraft(
        saved.id,
        saved.revision,
        { answers, notes: 'Overwrite' },
        false,
        db,
      ),
    ).rejects.toThrow('already completed')
  })
  it('rejects invalid values and oversized notes without mutating storage', async () => {
    const db = database()
    await startDemo(db)
    await expect(
      saveDraft(
        'willow-court',
        0,
        { answers: JSON.parse('{"walls":"unknown"}') as Answers, notes: '' },
        false,
        db,
      ),
    ).rejects.toThrow('invalid answer')
    await expect(
      saveDraft(
        'willow-court',
        0,
        { answers: {}, notes: 'x'.repeat(5001) },
        false,
        db,
      ),
    ).rejects.toThrow('5,000')
    expect((await db.inspections.get('willow-court'))?.revision).toBe(0)
  })
})
