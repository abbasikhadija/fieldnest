import { useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Icon } from './components/Icon'
import { SystemNotice } from './components/SystemNotice'
import { Work } from './pages/Work'
import { PlannedPage } from './pages/PlannedPage'

const links = [{ to: '/', label: 'My work', icon: 'work' }, { to: '/activity', label: 'Activity', icon: 'activity' }, { to: '/settings', label: 'Settings', icon: 'settings' }] as const
export function App() {
  const location = useLocation()
  useEffect(() => {
    document.title = `Fieldnest · ${links.find(link => link.to === location.pathname)?.label ?? 'Preview'}`
    document.getElementById('main')?.focus()
  }, [location.pathname])
  return <><a className="skip-link" href="#main">Skip to content</a><header className="header"><Link className="brand" to="/" aria-label="Fieldnest home"><span className="brand-mark"><Icon name="leaf" size={25} /></span>fieldnest<span className="brand-dot">.</span></Link><span className="header-note">Your work. Saved wherever you are.</span><span className="preview-label">M0 / Preview</span></header><div className="layout"><nav className="navigation" aria-label="Main navigation">{links.map(link => <NavLink end={link.to === '/'} key={link.to} to={link.to}><Icon name={link.icon} /><span>{link.label}</span></NavLink>)}<div className="nav-footer">Made for the field.<br /><span>Built around your work.</span></div></nav><div className="main-wrap"><SystemNotice /><main id="main" tabIndex={-1}><Routes><Route path="/" element={<Work />} /><Route path="/activity" element={<PlannedPage kind="activity" />} /><Route path="/settings" element={<PlannedPage kind="settings" />} /><Route path="/inspection/:id" element={<PlannedPage kind="inspection" />} /><Route path="/about" element={<PlannedPage kind="about" />} /><Route path="*" element={<div className="empty-state"><h1>That page isn’t here.</h1><Link className="button" to="/">Back to my work</Link></div>} /></Routes></main><footer className="page-footer"><span>FIELDNEST</span><span>A dependable place to begin.</span></footer></div></div></>
}
