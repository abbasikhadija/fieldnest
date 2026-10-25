import { type EditableInspection, type Inspection } from '../domain/inspection'
import { saveDraft, StaleDraftError } from './database'

export interface DraftState {
  record: Inspection
  dirty: boolean
  saving: boolean
  error: string | null
  stale: boolean
}
type Writer = typeof saveDraft
// Sessions survive route changes. A failed write keeps its in-memory draft until
// explicit retry/discard; a route change never disposes the only unsaved copy.
export class DraftSession {
  private state: DraftState
  private generation = 0
  private listeners = new Set<() => void>()
  private running: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  constructor(
    record: Inspection,
    private writer: Writer = saveDraft,
  ) {
    this.state = {
      record,
      dirty: false,
      saving: false,
      error: null,
      stale: false,
    }
  }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(patch: Partial<DraftState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
    notifySessions()
  }
  edit(draft: EditableInspection, debounce = false) {
    if (this.state.record.status === 'completed') return
    this.generation++
    this.publish({ record: { ...this.state.record, ...draft }, dirty: true })
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.state.error) return
    if (debounce) this.timer = setTimeout(() => void this.flush(), 250)
    else void this.flush()
  }
  flush = (): Promise<void> => {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.running) return this.running
    // Start on a microtask so running is assigned before any completion handler.
    this.running = Promise.resolve()
      .then(async () => {
        while (this.state.dirty) {
          const snapshot = this.state.record
          const generation = this.generation
          this.publish({ saving: true, error: null, stale: false })
          try {
            const saved = await this.writer(
              snapshot.id,
              snapshot.revision,
              snapshot,
            )
            const unchanged = generation === this.generation
            this.publish({
              record: unchanged
                ? saved
                : {
                    ...this.state.record,
                    revision: saved.revision,
                    updatedAt: saved.updatedAt,
                    status: 'draft',
                  },
              dirty: !unchanged,
            })
          } catch (error) {
            this.publish({
              error:
                error instanceof StaleDraftError
                  ? error.message
                  : 'Could not save on this device. Keep this tab open, download your draft, or retry. Check available storage.',
              stale: error instanceof StaleDraftError,
            })
            break
          }
        }
      })
      .finally(() => {
        this.running = null
        this.publish({ saving: false })
      })
    return this.running
  }
  async complete() {
    await this.flush()
    if (this.state.dirty || this.state.error) return
    this.publish({ saving: true })
    try {
      const record = await this.writer(
        this.state.record.id,
        this.state.record.revision,
        this.state.record,
        true,
      )
      this.publish({ record })
    } catch (error) {
      this.publish({
        dirty: true,
        error:
          error instanceof StaleDraftError
            ? error.message
            : 'Completion could not be saved. Your draft is still here. Retry saving, then complete again.',
        stale: error instanceof StaleDraftError,
      })
    } finally {
      this.publish({ saving: false })
    }
  }
}
const sessions = new Map<string, DraftSession>()
let sessionVersion = 0
const sessionListeners = new Set<() => void>()
function notifySessions() {
  sessionVersion++
  sessionListeners.forEach((listener) => listener())
}
export function subscribeSessions(listener: () => void) {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}
export function getSessionVersion() {
  return sessionVersion
}
export function sessionFor(record: Inspection, writer?: Writer) {
  const existing = sessions.get(record.id)
  if (existing) {
    const state = existing.getSnapshot()
    if (state.dirty || state.saving || state.record.revision >= record.revision)
      return existing
  }
  const session = new DraftSession(record, writer)
  sessions.set(record.id, session)
  return session
}
export function pendingSessions() {
  return [...sessions.values()].filter(
    (session) => session.getSnapshot().dirty || session.getSnapshot().saving,
  )
}
export function discardSession(id: string) {
  sessions.delete(id)
  notifySessions()
}
