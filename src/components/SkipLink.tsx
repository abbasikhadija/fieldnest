import type { MouseEvent } from 'react'

export function SkipLink() {
  function focusContent(event: MouseEvent<HTMLAnchorElement>) {
    // HashRouter owns the URL fragment; changing it to #main would change routes.
    event.preventDefault()
    document.getElementById('main')?.focus()
  }

  return <a className="skip-link" href="#main" onClick={focusContent}>Skip to content</a>
}
