import { useInspections } from '../persistence/useInspections'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { StorageError } from '../components/LocalData'
import { startDemo } from '../persistence/database'
import { progress, questions, statusLabel } from '../domain/inspection'

export function Work() {
  const data = useInspections()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(false)
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A little clarity for your day</p>
          <h1>My work</h1>
          <p>Your inspections, together in one place.</p>
        </div>
        <span className="badge">Local demo</span>
      </div>
      {!data ? (
        <p role="status">Opening your device workspace…</p>
      ) : data.error ? (
        <StorageError />
      ) : data.records.length ? (
        <>
          <div className="demo-notice">
            Fictional demo properties · Saved on this device only. No server
            synchronization.
          </div>
          <section
            aria-labelledby="inspections-heading"
            className="work-section"
          >
            <div className="section-heading">
              <h2 id="inspections-heading">Your inspections</h2>
              <span className="subtle">{data.records.length} properties</span>
            </div>
            <div className="inspection-list">
              {data.records.map((record) => (
                <Link
                  className="inspection-card"
                  to={`/inspection/${record.id}`}
                  key={record.id}
                >
                  <div className="property-icon">
                    <Icon name="home" />
                  </div>
                  <div className="property-copy">
                    <span className="eyebrow">{record.kind}</span>
                    <h2>{record.property}</h2>
                    <p>{record.address}</p>
                    <span className="status-pill">
                      {statusLabel(record.status)}
                    </span>
                    <div className="progress-row">
                      <progress
                        value={progress(record)}
                        max={questions.length}
                        aria-label={`${record.property} checklist progress`}
                      />
                      <span>
                        {progress(record)}/{questions.length} checks
                      </span>
                    </div>
                  </div>
                  <Icon name="arrow" size={20} />
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="welcome">
          <div className="welcome-copy">
            <span className="eyebrow">Made for the field</span>
            <h2>
              Good work starts
              <br />
              with a clear next step.
            </h2>
            <p>
              Try a property inspection with fictional records. Your answers
              stay on this device, ready to return to even without a connection.
            </p>
            <button
              className="button"
              disabled={starting}
              onClick={async () => {
                setStarting(true)
                setError(false)
                try {
                  await startDemo()
                } catch {
                  setError(true)
                } finally {
                  setStarting(false)
                }
              }}
            >
              {starting ? 'Preparing your workspace…' : 'Try Fieldnest'}{' '}
              <Icon name="arrow" size={18} />
            </button>
            {error && (
              <p role="alert">
                Could not create the demo on this device. Check storage
                permissions and available space, then try again. No save has
                been confirmed.
              </p>
            )}
          </div>
          <div className="welcome-symbol" aria-hidden="true">
            <Icon name="home" size={110} />
          </div>
        </section>
      )}
      <aside className="quiet-note">
        <Icon name="leaf" />
        <div>
          <strong>Your work. Saved wherever you are.</strong>
          <p>
            Locally saved work survives refreshes. Clearing browser data,
            storage eviction, or device loss can remove it. Download a copy of
            important records.
          </p>
        </div>
      </aside>
    </>
  )
}
