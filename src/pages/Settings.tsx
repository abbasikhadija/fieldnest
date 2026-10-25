import { Link } from 'react-router-dom'
import { useInspections } from '../persistence/useInspections'
import { useState } from 'react'
import { DownloadDraft, StorageError } from '../components/LocalData'
export function Settings() {
  const data = useInspections()
  const [storageMessage, setStorageMessage] = useState('')
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your device workspace</p>
          <h1>Settings</h1>
          <p>Keep your work close. Know where it’s stored.</p>
        </div>
      </div>
      <section className="form-panel">
        <h2>Connected account</h2>
        <p>
          Sign in to retrieve assignments from your inspection administrator.
          This is separate from the local demo.
        </p>
        <Link className="button secondary" to="/account">
          Open connected workspace
        </Link>
      </section>
      <section className="form-panel storage-panel">
        <h2>Local demo</h2>
        <p>
          This workspace contains fictional properties. No account is required
          and no records leave this device unless you download a copy.
        </p>
        {data?.error ? (
          <StorageError />
        ) : (
          data && (
            <>
              <p>{data.records.length} inspections on this device.</p>
              <DownloadDraft
                value={{
                  format: 'fieldnest-demo-export',
                  version: 1,
                  records: data.records,
                }}
              />
            </>
          )
        )}
      </section>
      <section className="form-panel storage-panel">
        <h2>Storage and recovery</h2>
        <p>
          Browser data can be cleared or evicted. Private browsing may remove it
          when the window closes. Device loss also means losing the local copy.
          Download important work and keep the file somewhere safe.
        </p>
        <p>
          Requesting persistent storage may reduce automatic eviction; your
          browser decides whether to grant it. It is not a backup.
        </p>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              if (!navigator.storage?.persist) {
                setStorageMessage(
                  'Persistent storage requests are not supported in this browser.',
                )
                return
              }
              const granted = await navigator.storage.persist()
              const estimate = await navigator.storage.estimate()
              setStorageMessage(
                `${granted ? 'Persistent storage granted.' : 'Your browser did not grant persistent storage.'} This origin uses approximately ${Math.ceil((estimate.usage ?? 0) / 1024)} KB. Keep a separate backup.`,
              )
            } catch {
              setStorageMessage(
                'Storage details are unavailable. Keep a separate backup of important work.',
              )
            }
          }}
        >
          Request persistent storage
        </button>
        <p role="status">{storageMessage}</p>
      </section>
    </>
  )
}
