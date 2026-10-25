import { useLiveQuery } from 'dexie-react-hooks'
import { DownloadDraft } from '../components/LocalData'
import type { ConnectedDatabase } from './database'
export function RecoveryHistory({
  db,
  id,
}: {
  db: ConnectedDatabase
  id: string
}) {
  const result = useLiveQuery(async () => {
    try {
      return {
        records: await db.resolutions
          .where('inspectionId')
          .equals(id)
          .sortBy('createdAt'),
        error: false,
      }
    } catch {
      return { records: [], error: true }
    }
  }, [db, id])
  if (result?.error)
    return (
      <p role="alert">
        Recovery history could not be read. Check device storage; do not clear
        browser data.
      </p>
    )
  if (!result?.records.length) return null
  return (
    <details className="recovery-history">
      <summary>Previous review copies ({result.records.length})</summary>
      <p>
        These copies stay on this device. Download them for a separate backup.
        They are not automatically restored or uploaded.
      </p>
      {result.records
        .slice()
        .reverse()
        .map((record) => (
          <section key={record.id}>
            <h3>
              {record.choice === 'device'
                ? 'Device copy queued for synchronization'
                : 'Reviewed server copy chosen'}
            </h3>
            <p>
              {new Date(record.createdAt).toLocaleString()} · Reviewed server
              version {record.server.version}
            </p>
            <DownloadDraft value={record} />
          </section>
        ))}
    </details>
  )
}
