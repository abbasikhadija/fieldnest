import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import {
  getSessionVersion,
  pendingSessions,
  subscribeSessions,
} from '../persistence/draftSession'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function SystemNotice() {
  useSyncExternalStore(subscribeSessions, getSessionVersion)
  const pending = pendingSessions()
  const [online, setOnline] = useState(navigator.onLine)
  const [registrationError, setRegistrationError] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => setRegistrationError(true) })
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (pendingSessions().length) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeLeave)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('beforeunload', beforeLeave)
    }
  }, [])
  return (
    <>
      {!online && (
        <div className="notice" role="status">
          You’re offline. You can continue available inspections and save on
          this device. Demo records are not synchronized.
        </div>
      )}
      {pending.some((session) => session.getSnapshot().error) && (
        <div className="notice" role="alert">
          Some edits are not saved. Keep this tab open.{' '}
          {pending
            .filter((session) => session.getSnapshot().error)
            .map((session) => (
              <Link
                className="text-link"
                key={session.getSnapshot().record.id}
                to={
                  session.getSnapshot().record.id.startsWith('connected:')
                    ? '/account'
                    : `/inspection/${session.getSnapshot().record.id}`
                }
              >
                Recover{' '}
                {session.getSnapshot().record.id.startsWith('connected:')
                  ? 'connected work (sign in)'
                  : session.getSnapshot().record.property}
              </Link>
            ))}
        </div>
      )}
      {registrationError && (
        <div className="notice" role="status">
          Offline setup could not finish. Reopen Fieldnest online to try again.
        </div>
      )}
      {needRefresh && (
        <div className="notice" role="status">
          An updated Fieldnest is ready.{' '}
          <button
            disabled={pending.length > 0}
            className="text-button"
            onClick={() => {
              if (!pendingSessions().length) void updateServiceWorker(true)
            }}
          >
            Reload to update
          </button>
          {pending.length > 0 && ' Save or recover your edits before updating.'}
        </div>
      )}
    </>
  )
}
