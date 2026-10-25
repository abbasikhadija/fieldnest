import { useState, useSyncExternalStore } from 'react'
import {
  sections,
  missingQuestions,
  type Inspection,
} from '../domain/inspection'
import { sessionFor, discardSession } from '../persistence/draftSession'
import type { CachedInspection, ConnectedDatabase } from './database'
import { syncLabel } from './status'
export function ConnectedEditor({
  value,
  db,
}: {
  value: CachedInspection
  db: ConnectedDatabase
}) {
  const source: Inspection = {
    ...value.inspection,
    id: `connected:${db.name}:${value.id}`,
    answers: value.record.answers,
    notes: value.record.notes,
    status: value.record.status,
    revision: value.revision,
    updatedAt: value.record.updated_at,
    completedAt: value.record.completed_at,
  }
  const session = sessionFor(
    source,
    async (_id, revision, draft, complete = false) => {
      await db.save(value.id, revision, {
        answers: draft.answers,
        notes: draft.notes,
        status: complete ? 'completed' : 'draft',
      })
      return {
        ...source,
        ...draft,
        id: source.id,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
        status: complete ? 'completed' : 'draft',
        completedAt: complete ? new Date().toISOString() : null,
      }
    },
  )
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [, rerender] = useState(0)
  const [review, setReview] = useState(false)
  const locked =
    state.record.status === 'completed' ||
    value.state === 'conflict' ||
    value.state === 'blocked'
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              inspection: value.inspection,
              local: state.record,
              server: value.remote,
              state: value.state,
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'fieldnest-inspection-recovery.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="form-panel">
      <p className="eyebrow">Connected inspection</p>
      <h2>{value.inspection.property}</h2>
      <p>{value.inspection.address}</p>
      <p role="status">
        {state.saving
          ? 'Saving on this device…'
          : state.dirty
            ? 'Changes not yet saved'
            : syncLabel(value)}{' '}
        · Version {value.record.version}
      </p>
      {value.message && <p role="alert">{value.message}</p>}
      {state.error && (
        <div role="alert">
          <p>{state.error}</p>
          <button className="button" onClick={() => void session.flush()}>
            Retry device save
          </button>
          {state.stale && (
            <button
              className="button secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Discard these unsaved edits and load the newer device copy? Download your changes first.',
                  )
                ) {
                  discardSession(source.id)
                  rerender((value) => value + 1)
                }
              }}
            >
              Load newer device copy
            </button>
          )}
        </div>
      )}
      {sections.map((section) => (
        <div className="review-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.questions.map((question) => (
            <fieldset className="question" key={question.id} disabled={locked}>
              <legend>{question.label}</legend>
              <div className="option-group">
                {(['pass', 'fail', 'na'] as const).map((answer) => (
                  <label
                    key={answer}
                    className={
                      state.record.answers[question.id] === answer
                        ? 'selected'
                        : ''
                    }
                  >
                    <input
                      type="radio"
                      name={`${value.id}-${question.id}`}
                      checked={state.record.answers[question.id] === answer}
                      onChange={() =>
                        session.edit({
                          answers: {
                            ...state.record.answers,
                            [question.id]: answer,
                          },
                          notes: state.record.notes,
                        })
                      }
                    />
                    {
                      { pass: 'Pass', fail: 'Fail', na: 'Not applicable' }[
                        answer
                      ]
                    }
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ))}
      <label htmlFor="connected-notes">Additional observations</label>
      <textarea
        id="connected-notes"
        disabled={locked}
        maxLength={5000}
        value={state.record.notes}
        onChange={(event) =>
          session.edit(
            { answers: state.record.answers, notes: event.target.value },
            true,
          )
        }
      />
      <div className="form-actions">
        <button className="button secondary" onClick={download}>
          Download device copy
        </button>
        {!locked && (
          <button
            className="button"
            disabled={state.saving}
            onClick={() => {
              setReview(true)
              if (!missingQuestions(state.record.answers).length)
                void session.complete()
            }}
          >
            Complete inspection
          </button>
        )}
      </div>
      {review && missingQuestions(state.record.answers).length > 0 && (
        <p role="alert">
          Answer {missingQuestions(state.record.answers).length} remaining
          checklist questions before completing. Your draft is saved separately.
        </p>
      )}
      {locked && (
        <p>
          Saved answers are read-only.{' '}
          {value.state === 'conflict'
            ? 'Keep your device copy for review.'
            : ''}
        </p>
      )}
    </section>
  )
}
