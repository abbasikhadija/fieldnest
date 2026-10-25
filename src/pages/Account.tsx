import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AccountStore } from '../auth/accountStore'
import { supabaseAuth } from '../auth/supabaseAuth'
import { createConfiguredClient } from '../remote/client'
import type { Database } from '../remote/database.types'
import { ConnectedWorkspace } from '../sync/ConnectedWorkspace'

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
          <p>Download your work, save on this device, and sync when connected.</p>
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
        Connected workspace · Separate from local demo records. Downloaded
        records can be saved on this device and synchronized with the server.
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
          <ConnectedWorkspace
            client={client}
            user={state.user}
            key={state.user.id}
          />
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
        Sign-out hides connected records and preserves pending device work and
        local demo drafts. Browser storage is not strong protection on a shared
        or compromised device. Offline access uses the last locally stored
        account session; reconnect to verify current access.
      </p>
    </>
  )
}
