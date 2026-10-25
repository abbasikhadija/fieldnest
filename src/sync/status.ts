import type { CachedInspection, Operation } from './database'
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

export function retrySummary(
  operations: Operation[],
  records: CachedInspection[],
  online: boolean,
  now: number,
) {
  const retryable = operations.filter((item) => !item.blocked)
  const conflicts = records.filter((item) => item.state === 'conflict').length
  const blocked = records.filter((item) => item.state === 'blocked').length
  const leased = retryable.filter((item) => item.leaseUntil > now).length
  const due = retryable.map((item) => Math.max(item.nextAttempt, item.leaseUntil))
  const next = due.length ? Math.min(...due) : now
  return [
    retryable.length
      ? !online
        ? `${retryable.length} inspection${retryable.length === 1 ? '' : 's'} saved on this device. Connect to resume synchronization.`
        : leased === retryable.length
          ? 'Confirming saved work with the server. Another tab may be synchronizing; interrupted attempts resume automatically.'
          : next > now
            ? `Saved work will retry in about ${Math.max(1, Math.ceil((next - now) / 1000))} seconds while this app is open. Choose Sync saved work to retry sooner.`
            : 'Saved work is waiting for server confirmation. Synchronization resumes while this app is open.'
      : '',
    conflicts ? `${conflicts} inspection${conflicts === 1 ? '' : 's'} need review. Open the inspection to compare both copies.` : '',
    blocked ? `${blocked} inspection${blocked === 1 ? '' : 's'} could not sync. Open the inspection for details; retry after resolving the issue.` : '',
  ].filter(Boolean).join(' ')
}
