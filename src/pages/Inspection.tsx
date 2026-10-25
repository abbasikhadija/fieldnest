import { useInspections } from '../persistence/useInspections'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DownloadDraft, StorageError } from '../components/LocalData'
import {
  missingQuestions,
  progress,
  questions,
  sections,
  statusLabel,
  type Inspection as InspectionRecord,
} from '../domain/inspection'
import { discardSession, sessionFor } from '../persistence/draftSession'

export function Inspection() {
  const { id } = useParams()
  const data = useInspections()
  if (!data) return <p role="status">Opening inspection…</p>
  if (data.error) return <StorageError />
  const record = data.records.find((item) => item.id === id)
  if (!record)
    return (
      <section className="empty-state">
        <h1>Inspection not found.</h1>
        <p>This property isn’t in your local demo workspace.</p>
        <Link className="button" to="/">
          Back to my work
        </Link>
      </section>
    )
  return <InspectionEditor record={record} key={record.id} />
}
function InspectionEditor({ record }: { record: InspectionRecord }) {
  const session = sessionFor(record)
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [review, setReview] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [, forceRender] = useState(0)
  const current = state.record
  const completed = current.status === 'completed'
  const heading = useRef<HTMLHeadingElement>(null)
  const propertyHeading = useRef<HTMLHeadingElement>(null)
  const firstSection = useRef(true)
  useEffect(() => {
    if (firstSection.current) {
      firstSection.current = false
      propertyHeading.current?.focus()
    }
    else heading.current?.focus()
  }, [sectionIndex, review, completed])
  const missing = missingQuestions(current.answers)
  const section = sections[sectionIndex]
  return (
    <>
      <Link className="text-link" to="/">
        ← My work
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{current.kind} · Fictional property</p>
          <h1 ref={propertyHeading} tabIndex={-1}>{current.property}</h1>
          <p>{current.address}</p>
        </div>
        <span className="badge">Local demo</span>
      </div>
      <div className="save-banner" role="status">
        {state.error
          ? 'Changes need attention'
          : state.saving || state.dirty
            ? 'Saving on this device…'
            : current.updatedAt
              ? 'Saved on this device'
              : 'No answers saved yet'}
        <span>
          {completed
            ? 'Completed locally · Not synchronized'
            : 'No server connection is used in demo mode.'}
        </span>
      </div>
      {state.error && (
        <section className="error-panel" role="alert">
          <h2>Your draft is still here.</h2>
          <p>{state.error}</p>
          {!state.stale && (
            <button
              className="button"
              disabled={state.saving}
              onClick={() => void session.flush()}
            >
              Retry save
            </button>
          )}{' '}
          <DownloadDraft value={current} />
          {state.stale && (
            <>
              <button
                className="text-button"
                onClick={() => setConfirmDiscard(true)}
              >
                Load newer device copy
              </button>
              {confirmDiscard && (
                <div className="confirmation">
                  <p>
                    This discards the unsaved changes shown here. Download them
                    first if you need to keep them.
                  </p>
                  <button
                    className="button"
                    onClick={() => {
                      discardSession(current.id)
                      setConfirmDiscard(false)
                      forceRender((value) => value + 1)
                    }}
                  >
                    Discard these edits and load device copy
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    Keep my edits
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      <div className="checklist-progress">
        <span>{completed ? 'Inspection complete' : 'Checklist progress'}</span>
        <strong>
          {progress(current)} of {questions.length} checks
        </strong>
        <progress
          value={progress(current)}
          max={questions.length}
          aria-label="Checklist progress"
        />
      </div>
      {!completed && (
        <nav className="section-tabs" aria-label="Inspection sections">
          {sections.map((item, index) => (
            <button
              key={item.title}
              aria-current={
                !review && index === sectionIndex ? 'step' : undefined
              }
              onClick={() => {
                setSectionIndex(index)
                setReview(false)
              }}
            >
              {index + 1}. {item.title}
            </button>
          ))}
          <button
            aria-current={review ? 'step' : undefined}
            onClick={() => setReview(true)}
          >
            5. Review
          </button>
        </nav>
      )}
      {!completed && !review ? (
        <section className="form-panel">
          <div className="section-heading">
            <h2 ref={heading} tabIndex={-1}>{section.title}</h2>
            <span className="subtle">All checks required</span>
          </div>
          <p className="form-help">
            Choose a result for each check. Incomplete drafts save
            automatically.
          </p>
          {section.questions.map((question) => (
            <fieldset
              className="question"
              key={question.id}
              disabled={completing}
            >
              <legend>{question.label}</legend>
              <div className="option-group">
                {(['pass', 'fail', 'na'] as const).map((answer) => (
                  <label
                    key={answer}
                    className={
                      current.answers[question.id] === answer ? 'selected' : ''
                    }
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={answer}
                      checked={current.answers[question.id] === answer}
                      onChange={() =>
                        session.edit({
                          answers: {
                            ...current.answers,
                            [question.id]: answer,
                          },
                          notes: current.notes,
                        })
                      }
                    />
                    {answer === 'na'
                      ? 'Not applicable'
                      : answer === 'pass'
                        ? 'Pass'
                        : 'Fail'}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="form-actions">
            {sectionIndex > 0 && (
              <button
                className="button secondary"
                onClick={() => setSectionIndex((index) => index - 1)}
              >
                Previous section
              </button>
            )}
            <button
              className="button"
              onClick={() =>
                sectionIndex < sections.length - 1
                  ? setSectionIndex((index) => index + 1)
                  : setReview(true)
              }
            >
              {sectionIndex < sections.length - 1
                ? 'Next section →'
                : 'Review inspection →'}
            </button>
          </div>
        </section>
      ) : (
        <section className="form-panel">
          <h2 ref={heading} tabIndex={-1}>
            {completed ? 'Completed inspection' : 'Review your inspection'}
          </h2>
          <p className="form-help">
            {completed
              ? statusLabel(current.status)
              : 'Review your answers and add any observations before completing.'}
          </p>
          {sections.map((item) => (
            <div className="review-section" key={item.title}>
              <h3>{item.title}</h3>
              <dl>
                {item.questions.map((question) => (
                  <div key={question.id}>
                    <dt>{question.label}</dt>
                    <dd>
                      {current.answers[question.id] === 'na'
                        ? 'Not applicable'
                        : current.answers[question.id] === 'pass'
                          ? 'Pass'
                          : current.answers[question.id] === 'fail'
                            ? 'Fail'
                            : 'Needs an answer'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {completed ? (
            <div className="observations">
              <h3>Additional observations</h3>
              <p>{current.notes || 'No additional observations.'}</p>
              <p className="subtle">
                Completed{' '}
                {current.completedAt
                  ? new Date(current.completedAt).toLocaleString()
                  : ''}{' '}
                · This device only
              </p>
              <DownloadDraft value={current} />
            </div>
          ) : (
            <>
              <label className="notes-label" htmlFor="notes">
                Additional observations <span>(optional)</span>
              </label>
              <textarea
                id="notes"
                aria-describedby="notes-help"
                rows={5}
                maxLength={5000}
                value={current.notes}
                disabled={completing}
                onChange={(event) =>
                  session.edit(
                    {
                      answers: current.answers,
                      notes: event.target.value,
                    },
                    true,
                  )
                }
                placeholder="Describe any issues, including checks marked Fail…"
              />
              <p className="subtle" id="notes-help">
                {current.notes.length}/5,000 characters · Saves automatically
              </p>
              {missing.length > 0 && (
                <div className="validation" role="status">
                  {missing.length} checks still need an answer. Return to their
                  sections to finish, or leave now and continue this draft
                  later.
                  <ul className="missing-sections">
                    {sections.map((item, index) => item.questions.some((question) => missing.some((entry) => entry.id === question.id)) && (
                      <li key={item.title}>
                        <button className="text-button" onClick={() => { setSectionIndex(index); setReview(false) }}>
                          Finish {item.title.toLowerCase()}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="completion-note">
                Completing locks this demo inspection for review. It stays on
                this device and is not sent to a server.
              </div>
              <button
                className="button"
                disabled={
                  missing.length > 0 || completing || Boolean(state.error)
                }
                onClick={async () => {
                  setCompleting(true)
                  try {
                    await session.complete()
                  } finally {
                    setCompleting(false)
                  }
                }}
              >
                {completing ? 'Saving completion…' : 'Complete inspection'}
              </button>
            </>
          )}
        </section>
      )}
    </>
  )
}
