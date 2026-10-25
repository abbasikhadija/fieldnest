import { afterEach, describe, expect, it, vi } from 'vitest'
import { DraftSession } from './draftSession'
import { StaleDraftError, type saveDraft } from './database'
import type { Inspection } from '../domain/inspection'
const record: Inspection = {
  id: 'test',
  property: 'Test property',
  address: 'Fictional',
  kind: 'Routine',
  answers: {},
  notes: '',
  status: 'not-started',
  revision: 0,
  updatedAt: null,
  completedAt: null,
}
type Writer = typeof saveDraft
afterEach(() => vi.useRealTimers())
describe('autosave acknowledgment and recovery', () => {
  it('debounces notes and lets explicit flush bypass the timer', async () => {
    vi.useFakeTimers()
    const writer = vi.fn<Writer>(async (_id, revision, draft) => ({
      ...record,
      ...draft,
      revision: revision + 1,
      status: 'draft',
    }))
    const session = new DraftSession(record, writer)
    session.edit({ answers: {}, notes: 'First' }, true)
    session.edit({ answers: {}, notes: 'Latest' }, true)
    await vi.advanceTimersByTimeAsync(249)
    expect(writer).not.toHaveBeenCalled()
    expect(session.getSnapshot().dirty).toBe(true)
    await session.flush()
    expect(writer).toHaveBeenCalledTimes(1)
    expect(session.getSnapshot().record.notes).toBe('Latest')
    await vi.advanceTimersByTimeAsync(1000)
    expect(writer).toHaveBeenCalledTimes(1)
  })
  it('recovers a failed completion without losing the acknowledged draft', async () => {
    const writer = vi
      .fn<Writer>()
      .mockRejectedValueOnce(new Error('Disk full'))
      .mockImplementation(async (_id, revision, draft, complete) => ({
        ...record,
        ...draft,
        revision: revision + 1,
        status: complete ? 'completed' : 'draft',
      }))
    const session = new DraftSession({ ...record, status: 'draft' }, writer)
    await session.complete()
    expect(session.getSnapshot()).toMatchObject({
      dirty: true,
      error: expect.stringContaining('Completion could not be saved'),
    })
    await session.flush()
    expect(session.getSnapshot()).toMatchObject({ dirty: false, error: null })
    await session.complete()
    expect(session.getSnapshot().record.status).toBe('completed')
  })
  it('does not acknowledge before write completion and coalesces rapid edits in order', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const writer = vi.fn<Writer>(async (_id, revision, draft) => {
      if (revision === 0) await gate
      return {
        ...record,
        ...draft,
        revision: revision + 1,
        updatedAt: '2026-10-25T00:00:00Z',
        status: 'draft',
      }
    })
    const session = new DraftSession(record, writer)
    session.edit({ answers: { walls: 'pass' }, notes: 'First' })
    await Promise.resolve()
    expect(session.getSnapshot()).toMatchObject({ dirty: true, saving: true })
    session.edit({ answers: { walls: 'pass' }, notes: 'Latest' })
    release()
    await session.flush()
    expect(writer).toHaveBeenCalledTimes(2)
    expect(writer.mock.calls[1][1]).toBe(1)
    expect(session.getSnapshot()).toMatchObject({
      dirty: false,
      saving: false,
      record: { notes: 'Latest', revision: 2 },
    })
  })
  it('retains failed drafts and retries the latest buffer', async () => {
    const writer = vi
      .fn<Writer>()
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockImplementation(async (_id, revision, draft) => ({
        ...record,
        ...draft,
        revision: revision + 1,
        status: 'draft',
      }))
    const session = new DraftSession(record, writer)
    session.edit({ answers: {}, notes: 'Unsaved' })
    await session.flush()
    expect(session.getSnapshot()).toMatchObject({
      dirty: true,
      error: expect.stringContaining('Could not save'),
    })
    session.edit({ answers: {}, notes: 'Still here, with another edit' })
    expect(writer).toHaveBeenCalledTimes(1)
    await session.flush()
    expect(session.getSnapshot()).toMatchObject({
      dirty: false,
      error: null,
      record: { notes: 'Still here, with another edit' },
    })
  })
  it('preserves stale edits and does not claim a successful completion', async () => {
    const writer = vi.fn<Writer>().mockRejectedValue(new StaleDraftError())
    const session = new DraftSession(record, writer)
    session.edit({ answers: { walls: 'fail' }, notes: 'Second tab draft' })
    await session.flush()
    expect(session.getSnapshot()).toMatchObject({
      stale: true,
      dirty: true,
      record: { notes: 'Second tab draft', revision: 0 },
    })
    await session.complete()
    expect(session.getSnapshot().record.status).not.toBe('completed')
  })
})
