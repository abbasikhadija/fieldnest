import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function SystemNotice() {
  const [online, setOnline] = useState(navigator.onLine)
  const [registrationError, setRegistrationError] = useState(false)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ onRegisterError: () => setRegistrationError(true) })
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return <>
    {!online && <div className="notice" role="status">You’re offline. Previously cached screens are available. Inspection saving arrives in the next milestone.</div>}
    {registrationError && <div className="notice" role="status">Offline setup could not finish. Reopen Fieldnest online to try again.</div>}
    {needRefresh && <div className="notice" role="status">An updated Fieldnest is ready. <button className="text-button" onClick={() => void updateServiceWorker(true)}>Reload to update</button></div>}
  </>
}
