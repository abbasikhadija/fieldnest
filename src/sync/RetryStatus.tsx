import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { retrySummary } from './status'
import type { CachedInspection, ConnectedDatabase } from './database'

export function RetryStatus({ db, records }: {
  db: ConnectedDatabase
  records: CachedInspection[]
}) {
  const [now, setNow] = useState(Date.now)
  const [online, setOnline] = useState(navigator.onLine)
  const result = useLiveQuery(async () => {
    try {
      return { operations: await db.operations.toArray(), failed: false }
    } catch {
      return { operations: [], failed: true }
    }
  }, [db])
  useEffect(() => {
    const update = () => { setNow(Date.now()); setOnline(navigator.onLine) }
    const timer = setInterval(update, 1000)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (result?.failed)
    return <p role="alert">Sync status could not be read from device storage. Keep your work open and download a copy before checking available space.</p>
  const summary = retrySummary(result?.operations ?? [], records, online, now)
  // Countdown updates are visible without announcing every second to screen readers.
  return summary ? <p className="account-message">{summary}</p> : null
}
