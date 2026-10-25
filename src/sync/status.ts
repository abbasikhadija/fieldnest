import type { CachedInspection } from './database'
export function syncLabel(value: CachedInspection) {
  return (
    (value.record.status === 'completed' ? 'Completed inspection · ' : '') +
    {
      synced: 'Synchronized with server',
      syncing: navigator.onLine
        ? 'Synchronizing · Device copy saved'
        : 'Saved on this device · Waiting to sync',
      pending: 'Saved on this device · Waiting to sync',
      conflict: 'Needs review · Device copy preserved',
      blocked: 'Unable to sync · Device copy preserved',
    }[value.state]
  )
}
