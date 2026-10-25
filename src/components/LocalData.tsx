import { useState } from 'react'
export function StorageError() {
  return (
    <section className="empty-state" role="alert">
      <h2>Device storage isn’t available.</h2>
      <p>
        Fieldnest cannot read your local inspections. Check your browser’s
        storage permissions and available space, then reload. Don’t clear
        browser data if you have saved work.
      </p>
      <button className="button" onClick={() => window.location.reload()}>
        Retry loading
      </button>
    </section>
  )
}
export function DownloadDraft({ value }: { value: unknown }) {
  const [error, setError] = useState(false)
  return (
    <>
      <button
        className="button secondary"
        onClick={() => {
          try {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(value, null, 2)], {
                type: 'application/json',
              }),
            )
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'fieldnest-demo-draft.json'
            anchor.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          } catch {
            setError(true)
          }
        }}
      >
        Download a copy
      </button>
      {error && (
        <p role="alert">
          Download failed. Keep this tab open and copy your observations before
          leaving.
        </p>
      )}
    </>
  )
}
