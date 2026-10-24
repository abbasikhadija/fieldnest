import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

const content = {
  activity: { title: 'Activity', intro: 'A clear picture of where your work stands.', heading: 'Nothing to report yet.', body: 'Local saves, pending submissions, and server confirmations will appear here when those features are available. No records have been saved or synchronized.', icon: 'activity' },
  settings: { title: 'Settings', intro: 'Just the essentials for working in the field.', heading: 'A simple foundation.', body: 'This preview requires no account or backend credentials. Device storage controls arrive with local drafts; connected accounts arrive in M2.', icon: 'settings' },
  inspection: { title: 'Inspection details', intro: 'The right context before you begin.', heading: 'A place for every property.', body: 'Property information, checklist progress, and submission status will live here. Inspection assignments, forms, and local saving are planned for M1.', icon: 'home' },
  about: { title: 'Built for wherever work takes you.', intro: 'Property inspections, with peace of mind.', heading: 'The foundation is in place.', body: 'Fieldnest is being built for property inspectors who need to keep working when connectivity drops. M0 provides the app shell and offline screen caching. Try Fieldnest demo records and inspection editing arrive in M1; real server synchronization follows later.', icon: 'leaf' },
} as const
export function PlannedPage({ kind }: { kind: keyof typeof content }) {
  const page = content[kind]
  return <><div className="page-heading"><div><p className="eyebrow">Fieldnest / Foundation preview</p><h1>{page.title}</h1><p>{page.intro}</p></div></div><section className="empty-state standalone"><div className="icon-tile"><Icon name={page.icon} size={28} /></div><h2>{page.heading}</h2><p>{page.body}</p><Link className="button secondary" to="/">Back to my work <Icon name="arrow" size={18} /></Link></section>{kind === 'settings' && <p className="storage-note">Browser storage can be cleared or evicted and cannot protect against device loss. Never rely on a single device as your only copy of important work.</p>}</>
}
