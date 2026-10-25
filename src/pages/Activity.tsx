import { useInspections } from '../persistence/useInspections'
import { Link } from 'react-router-dom'
import { StorageError } from '../components/LocalData'
import { statusLabel } from '../domain/inspection'
export function Activity() {
  const data = useInspections()
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Local demo workspace</p>
          <h1>Activity</h1>
          <p>See the latest saved state of each inspection.</p>
        </div>
      </div>
      {!data ? (
        <p role="status">Reading device records…</p>
      ) : data.error ? (
        <StorageError />
      ) : data.records.some((record) => record.updatedAt) ? (
        <div className="inspection-list">
          {data.records
            .filter((record) => record.updatedAt)
            .sort((a, b) =>
              (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
            )
            .map((record) => (
              <Link
                className="activity-row"
                key={record.id}
                to={`/inspection/${record.id}`}
              >
                <div>
                  <h2>{record.property}</h2>
                  <p>{statusLabel(record.status)}</p>
                </div>
                <time dateTime={record.updatedAt ?? ''}>
                  {new Date(record.updatedAt!).toLocaleString()}
                </time>
              </Link>
            ))}
        </div>
      ) : (
        <section className="empty-state">
          <h2>Nothing saved yet.</h2>
          <p>
            Your device saves will appear here once you start an inspection.
          </p>
          <Link className="button" to="/">
            Go to my work
          </Link>
        </section>
      )}
      <p className="storage-note">
        Demo records stay on this device. No records have been synchronized with
        a server.
      </p>
    </>
  )
}
