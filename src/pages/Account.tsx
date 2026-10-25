import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AccountStore, type AccountIdentity } from '../auth/accountStore'
import { supabaseAuth } from '../auth/supabaseAuth'
import { createConfiguredClient } from '../remote/client'
import type {
  Database,
  RemoteInspection,
  RemoteRecord,
} from '../remote/database.types'
import { loadAssignments, loadRecord } from '../remote/inspections'
import { sections } from '../domain/inspection'

// Lazy-loaded with this route. An unconfigured backend never breaks local demo.
let client: SupabaseClient<Database> | null = null
let configError = false
try {
  client = createConfiguredClient()
} catch {
  configError = true
}

export default function Account() {
  return (
    <>
      <Link className="text-link" to="/">
        ← Local demo workspace
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Connected account</p>
          <h1>Your assigned inspections</h1>
          <p>Sign in to view the work assigned to your account.</p>
        </div>
      </div>
      {client ? (
        <ConnectedAccount client={client} />
      ) : (
        <section className="form-panel">
          <h2>
            {configError
              ? 'Account configuration needs attention.'
              : 'Connected accounts are not configured on this deployment.'}
          </h2>
          <p>
            The local demo is ready to use. An administrator needs to connect
            this deployment to your inspection service before accounts can sign
            in.
          </p>
          <a
            className="text-link"
            href="https://github.com/abbasikhadija/fieldnest/blob/main/docs/BACKEND_SETUP.md"
            target="_blank"
            rel="noreferrer"
          >
            Backend setup instructions ↗
          </a>
        </section>
      )}
    </>
  )
}
function ConnectedAccount({ client }: { client: SupabaseClient<Database> }) {
  const [store] = useState(() => new AccountStore(supabaseAuth(client)))
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => store.start(), [store])
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine) void store.refresh()
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [store])
  async function signIn(event: FormEvent) {
    event.preventDefault()
    try {
      await store.signIn(email.trim(), password)
    } finally {
      setPassword('')
    }
  }
  return (
    <>
      <div className="demo-notice">
        Connected workspace · Separate from local demo records. Server records
        are read-only in this release.
      </div>
      {state.message && (
        <p className="account-message" role="status">
          {state.message}
        </p>
      )}
      {state.phase === 'checking' ? (
        <p role="status">Verifying your account…</p>
      ) : state.user ? (
        <>
          <div className="account-bar">
            <p>
              Signed in as <strong>{state.user.email}</strong>
            </p>
            <button
              className="button secondary"
              onClick={() => void store.signOut()}
            >
              Sign out
            </button>
          </div>
          {online ? (
            <AccountRecords
              client={client}
              user={state.user}
              key={state.user.id}
            />
          ) : (
            <div className="form-panel">
              <h2>A connection is needed.</h2>
              <p>
                Connected assignments are not cached on this device in this
                release. Reconnect to verify your account and retrieve them. The
                separate local demo supports offline inspections.
              </p>
            </div>
          )}
        </>
      ) : state.logoutFailed ? (
        <button className="button" onClick={() => void store.signOut()}>
          Retry sign out
        </button>
      ) : (
        <form
          className="form-panel sign-in"
          onSubmit={(event) => void signIn(event)}
        >
          <h2>Sign in</h2>
          <p>
            Use an account provided by your inspection administrator. Sign-in
            requires an internet connection.
          </p>
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
          />
          <label htmlFor="account-password">Password</label>
          <input
            id="account-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={256}
          />
          <button className="button" disabled={!online} type="submit">
            Sign in
          </button>
          {!online && <p role="status">Reconnect to sign in.</p>}
        </form>
      )}
      <p className="storage-note">
        Sign-out hides connected records and preserves local demo drafts. This
        release keeps connected inspection data in memory only; your browser
        retains the login session until sign-out. Browser storage is not strong
        protection on a shared or compromised device. No server editing or
        synchronization is available yet.
      </p>
    </>
  )
}
function AccountRecords({
  client,
  user,
}: {
  client: SupabaseClient<Database>
  user: AccountIdentity
}) {
  const [records, setRecords] = useState<RemoteInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<RemoteInspection | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    loadAssignments(client, user.id, page * 25, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setRecords((previous) =>
            page === 0
              ? items
              : [
                  ...previous,
                  ...items.filter(
                    (item) =>
                      !previous.some((existing) => existing.id === item.id),
                  ),
                ],
          )
          setHasMore(items.length === 25)
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Could not load assignments.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [client, user.id, page, retry])
  if (selected)
    return (
      <ServerRecord
        client={client}
        user={user}
        inspection={selected}
        onBack={() => setSelected(null)}
      />
    )
  return (
    <section className="work-section">
      <div className="section-heading">
        <h2>Assigned to you</h2>
        <span className="subtle">From the server</span>
      </div>
      {error && (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          <button
            className="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry loading
          </button>
        </div>
      )}
      <div className="inspection-list">
        {records.map((record) => (
          <button
            className="inspection-card remote-card"
            key={record.id}
            onClick={() => setSelected(record)}
          >
            <div className="property-copy">
              <span className="eyebrow">{record.kind}</span>
              <h3>{record.property}</h3>
              <p>{record.address}</p>
              <span className="status-pill">
                {record.due_on ? `Due ${record.due_on}` : 'No due date'}
              </span>
            </div>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
      {loading && <p role="status">Loading authorized assignments…</p>}
      {!loading && !error && records.length === 0 && (
        <div className="empty-state">
          <h3>No assignments yet.</h3>
          <p>Your administrator can assign inspections to this account.</p>
        </div>
      )}
      {hasMore && !loading && !error && (
        <button
          className="button secondary"
          onClick={() => setPage((value) => value + 1)}
        >
          Load more assignments
        </button>
      )}
    </section>
  )
}
function ServerRecord({
  client,
  user,
  inspection,
  onBack,
}: {
  client: SupabaseClient<Database>
  user: AccountIdentity
  inspection: RemoteInspection
  onBack: () => void
}) {
  const [record, setRecord] = useState<RemoteRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    setRecord(null)
    loadRecord(client, user.id, inspection.id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setRecord(value)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [client, user.id, inspection.id, retry])
  return (
    <>
      <button className="text-button" onClick={onBack}>
        ← Assigned inspections
      </button>
      <section className="form-panel">
        <p className="eyebrow">Server record · Read-only</p>
        <h2>{inspection.property}</h2>
        <p>{inspection.address}</p>
        {loading ? (
          <p role="status">Loading authorized record…</p>
        ) : error ? (
          <div role="alert">
            <p>
              Could not load this record. It may be unavailable or your access
              may have changed.
            </p>
            <button
              className="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry loading record
            </button>
          </div>
        ) : !record ? (
          <p>No inspection record is available to this account.</p>
        ) : (
          <>
            <span className="status-pill">
              {record.status === 'completed'
                ? 'Completed on server'
                : 'Server draft'}{' '}
              · Version {record.version}
            </span>
            {sections.map((section) => (
              <div className="review-section" key={section.title}>
                <h3>{section.title}</h3>
                <dl>
                  {section.questions.map((question) => (
                    <div key={question.id}>
                      <dt>{question.label}</dt>
                      <dd>
                        {{ pass: 'Pass', fail: 'Fail', na: 'Not applicable' }[
                          record.answers[question.id] as 'pass' | 'fail' | 'na'
                        ] ?? 'Not answered'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <h3>Additional observations</h3>
            <p className="remote-notes">
              {record.notes || 'No observations recorded.'}
            </p>
            <p className="subtle">
              Updated {new Date(record.updated_at).toLocaleString()}
            </p>
          </>
        )}
      </section>
    </>
  )
}
