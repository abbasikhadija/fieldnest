import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AccountIdentity } from '../auth/accountStore'
import type { Database } from '../remote/database.types'
import { loadAssignments, loadRecord } from '../remote/inspections'
import { sendOperation } from '../remote/operations'
import { ConnectedDatabase } from './database'
import { SyncWorker } from './worker'
import { pendingSessions } from '../persistence/draftSession'
import { ConnectedEditor } from './ConnectedEditor'
import { syncLabel } from './status'

export function ConnectedWorkspace({
  client,
  user,
}: {
  client: SupabaseClient<Database>
  user: AccountIdentity
}) {
  const [db] = useState(
    () => new ConnectedDatabase(user.id, import.meta.env.VITE_SUPABASE_URL),
  )
  const [worker] = useState(
    () =>
      new SyncWorker(
        db,
        (op, signal) => sendOperation(client, user.id, op, signal),
        () => navigator.onLine,
      ),
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const records = useLiveQuery(
    () =>
      db.records.toArray().catch(() => {
        setStorageError(true)
        return []
      }),
    [db],
  )
  useEffect(() => {
    worker.start()
    let alive = true
    const controller = new AbortController()
    const refresh = async () => {
      if (!navigator.onLine) return
      setLoading(true)
      try {
        // Bound each download pass. Further assignments are available explicitly.
        const assignments = await loadAssignments(
          client,
          user.id,
          page * 25,
          controller.signal,
        )
        for (const inspection of assignments) {
          if (!alive) break
          const record = await loadRecord(
            client,
            user.id,
            inspection.id,
            controller.signal,
          )
          if (
            alive &&
            record &&
            !pendingSessions().some(
              (session) =>
                session.getSnapshot().record.id ===
                `connected:${db.name}:${inspection.id}`,
            )
          )
            await db.cache(inspection, record)
        }
        if (alive) {
          setHasMore(assignments.length === 25)
          setMessage('')
        }
      } catch {
        if (alive)
          setMessage(
            'Could not refresh assignments. Downloaded device copies are still available.',
          )
      } finally {
        if (alive) setLoading(false)
      }
    }
    const process = () => {
      void worker.run().catch(() => {
        if (alive)
          setMessage(
            'Sync could not update device storage. Saved work is retained. Retry after checking available space.',
          )
      })
    }
    const online = () => {
      process()
      void refresh()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') process()
    }
    void refresh()
    process()
    const timer = setInterval(process, 1000)
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    return () => {
      alive = false
      controller.abort()
      worker.stop()
      clearInterval(timer)
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visible)
      // Do not delete or close storage while an acknowledgment/write may finish.
    }
  }, [client, db, user.id, worker, page, refreshKey])
  const current = records?.find((value) => value.id === selected)
  return (
    <section className="work-section">
      <div className="section-heading">
        <h2>Assigned to you</h2>
        <button
          className="button secondary"
          onClick={() =>
            void db
              .retryBlocked()
              .then(() => worker.run())
              .catch(() =>
                setMessage('Could not sync. Check device storage and retry.'),
              )
          }
        >
          Sync saved work
        </button>
      </div>
      <button
        className="text-button"
        onClick={() => setRefreshKey((value) => value + 1)}
      >
        Refresh downloaded assignments
      </button>
      <p className="storage-note">
        Downloaded inspections are available offline on this browser. Sign-out
        hides them and retains pending work. Reopen with the same account to
        continue. Device storage can be deleted or evicted; download a copy for
        recovery.
      </p>
      {loading && <p role="status">Loading authorized assignments…</p>}
      {hasMore && !loading && (
        <button
          className="button secondary"
          onClick={() => setPage((value) => value + 1)}
        >
          Load more assignments
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {storageError && (
        <p role="alert">
          Device storage is unavailable. Keep unsaved work open and download a
          copy. Check available space, then reload.
        </p>
      )}
      {current ? (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            ← Assigned inspections
          </button>
          <ConnectedEditor
            key={current.id}
            value={current}
            db={db}
            client={client}
            userId={user.id}
          />
        </>
      ) : (
        <div className="inspection-list">
          {records?.map((value) => (
            <button
              className="inspection-card remote-card"
              key={value.id}
              onClick={() => setSelected(value.id)}
            >
              <div className="property-copy">
                <span className="eyebrow">{value.inspection.kind}</span>
                <h3>{value.inspection.property}</h3>
                <p>{value.inspection.address}</p>
                <span className="status-pill">{syncLabel(value)}</span>
              </div>
              <span aria-hidden="true">→</span>
            </button>
          ))}
          {!loading && records?.length === 0 && (
            <p>
              No downloaded assignments. Connect to retrieve your assigned work.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
