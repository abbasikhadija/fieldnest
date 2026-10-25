import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
export function About() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Fieldnest / Local demo</p>
          <h1>Built for wherever work takes you.</h1>
          <p>Property inspections, with peace of mind.</p>
        </div>
      </div>
      <section className="empty-state standalone">
        <div className="icon-tile">
          <Icon name="leaf" size={28} />
        </div>
        <h2>Ready for a day in the field.</h2>
        <p>
          Try Fieldnest from My work to inspect fictional properties. Answer the
          checklist, save incomplete drafts, and return after a refresh—even
          offline once the app is cached. Demo records stay on this device.
          Connected accounts can read assigned server records when a backend is
          configured. Server editing and synchronization are not available yet.
        </p>
        <Link className="button secondary" to="/">
          Back to my work <Icon name="arrow" size={18} />
        </Link>
      </section>
    </>
  )
}
