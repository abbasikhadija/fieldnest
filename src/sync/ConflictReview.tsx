import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { compareCopies } from '../domain/conflict'
import type { Database } from '../remote/database.types'
import { loadRecord } from '../remote/inspections'
import { DownloadDraft } from '../components/LocalData'
import type { CachedInspection, ConnectedDatabase } from './database'

export function ConflictReview({
  value,
  db,
  client,
  userId,
  disabled,
}: {
  value: CachedInspection
  db: ConnectedDatabase
  client: SupabaseClient<Database>
  userId: string
  disabled: boolean
}) {
  const [choice, setChoice] = useState<'device' | 'server' | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(navigator.onLine)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [checkedAt, setCheckedAt] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    if (!navigator.onLine) {
      setBusy(false)
      return () => controller.abort()
    }
    setBusy(true)
    setError('')
    loadRecord(client, userId, value.id, controller.signal)
      .then(async (remote) => {
        if (controller.signal.aborted) return
        if (!remote) throw new Error('Record unavailable')
        await db.refreshConflict(value.id, value.revision, remote)
        if (!controller.signal.aborted)
          setCheckedAt(new Date().toLocaleTimeString())
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'Could not refresh the server copy. The last saved copy is shown. Any submission still checks its version.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [client, db, userId, value.id, value.revision, refresh])
  const remote = value.remote
  if (!remote)
    return (
      <div role="alert">
        The saved server copy is unavailable. Keep your device copy and download
        it before contacting your administrator.
      </div>
    )
  const rows = compareCopies(value.record, remote)
  const differences = rows.filter((row) => row.different)
  async function resolve() {
    if (!choice || busy || disabled || !remote) return
    setBusy(true)
    setError('')
    try {
      await db.resolveConflict(value.id, value.revision, remote.version, choice)
    } catch {
      setError(
        'The choice could not be saved, or this conflict changed in another tab. Both copies are retained. Refresh or reopen this inspection and review again.',
      )
      setChoice(null)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="conflict-review" aria-labelledby="conflict-heading">
      <p className="eyebrow">Needs your review</p>
      <h2 id="conflict-heading" tabIndex={-1}>
        Review conflicting changes
      </h2>
      <p role="alert">
        Someone updated this inspection while you were working. Compare both
        copies and choose what to keep. Nothing is merged automatically.
      </p>
      <div className="conflict-context">
        <p>
          <strong>Your saved device copy</strong>
          <br />
          Based on server version {value.record.version}
        </p>
        <p>
          <strong>Server copy · Version {remote.version}</strong>
          <br />
          Updated {new Date(remote.updated_at).toLocaleString()}
        </p>
      </div>
      <p className="storage-note">
        {checkedAt
          ? `Server copy checked at ${checkedAt}.`
          : 'Showing the last saved server snapshot.'}{' '}
        {navigator.onLine
          ? 'A new server edit after review will require another review.'
          : 'You’re offline. Your choice can be saved locally; syncing requires a connection.'}
      </p>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => setRefresh((value) => value + 1)}
      >
        Refresh server copy
      </button>
      {busy && <p role="status">Checking or saving your review…</p>}
      {error && (
        <p role="alert" className="validation">
          {error}
        </p>
      )}
      <p className="difference-count">
        {differences.length
          ? `${differences.length} differences to review`
          : 'Both copies have the same answers, observations and completion state.'}
      </p>
      <button
        className="text-button"
        aria-pressed={showAll}
        onClick={() => setShowAll((value) => !value)}
      >
        {showAll ? 'Show differences only' : 'Show all checks'}
      </button>
      <table className="conflict-table">
        <caption className="sr-only">
          Device and server inspection comparison
        </caption>
        <thead>
          <tr>
            <th scope="col">Inspection item</th>
            <th scope="col">Device copy</th>
            <th scope="col">Server copy</th>
          </tr>
        </thead>
        <tbody>
          {(showAll ? rows : differences).map((row) => (
            <tr key={row.label} className={row.different ? 'different' : ''}>
              <th scope="row">
                {row.label}
                {row.different && (
                  <span className="difference-marker">Different</span>
                )}
              </th>
              <td>{row.local}</td>
              <td>{row.server}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <DownloadDraft
        value={{
          inspection: value.inspection,
          local: value.record,
          server: remote,
        }}
      />
      {remote.status === 'completed' && (
        <p className="validation">
          The server inspection is completed and locked. You can keep its copy
          on this device and download your changes for follow-up. Completed
          server records cannot be overwritten.
        </p>
      )}
      <fieldset className="resolution-options" disabled={busy || disabled}>
        <legend>Choose how to resolve this inspection</legend>
        <label>
          <input
            type="radio"
            name="resolution"
            checked={choice === 'server'}
            onChange={() => setChoice('server')}
          />
          <span>
            <strong>Use server copy</strong>
            <small>
              Keep the reviewed server answers on this device. Your device edits
              stay in the recovery history.
            </small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="resolution"
            checked={choice === 'device'}
            disabled={remote.status === 'completed'}
            onChange={() => setChoice('device')}
          />
          <span>
            <strong>Apply my device copy</strong>
            <small>
              Queue your saved device answers against server version{' '}
              {remote.version}. Server acceptance is confirmed only after
              synchronization.
            </small>
          </span>
        </label>
      </fieldset>
      <p className="storage-note">
        Both reviewed copies will be kept in this device’s recovery history. A
        failed save leaves the conflict unchanged. Your selection does not
        change any server record until a version-checked operation succeeds.
      </p>
      <button
        className="button"
        disabled={!choice || busy || disabled}
        onClick={() => void resolve()}
      >
        {choice === 'device'
          ? 'Queue reviewed device copy'
          : 'Save reviewed server copy'}
      </button>
    </section>
  )
}
