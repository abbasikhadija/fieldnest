# Architecture

## Implemented in M0
React with strict TypeScript, Vite and Tailwind CSS v4. App owns layout and React Router routes; src/pages owns screen content; src/components owns shared icons and system notices. CSS defines reusable visual primitives and mobile bottom navigation. No external font requests or image dependencies.

HashRouter keeps route fragments client-side so GitHub Pages needs no fallback rewrite. Vite base is /fieldnest/. PWA start URL, id, scope, navigation fallback and icons use this repository scope. vite-plugin-pwa/Workbox precaches static build assets only; no authenticated API runtime cache exists. Updates require an explicit reload action. Offline capability begins after successful service-worker installation; this milestone only caches screens.

Vitest/Testing Library check navigation and fallback behavior. Playwright runs production preview on desktop and mobile, verifies hash navigation, offline reload and viewport overflow. GitHub Actions runs all checks before uploading and deploying Pages artifacts on main; pull requests only verify.

Set FIELDNEST_BASE_URL to an HTTPS URL ending in /fieldnest/ to run Playwright against a real deployment without starting the local preview server. The same assertions check deployed manifest assets and service-worker scope. The keyboard skip link focuses main without mutating the fragment owned by HashRouter.

## Planned boundaries
M1 introduces domain models, versioned Dexie persistence and form validation. M2 introduces Supabase auth, remote access and SQL migrations. M3 adds a synchronization engine separated from UI. No empty implementation stubs or backend clients are introduced in M0. Account caches and demo caches must remain isolated. Database integration and deterministic synchronization suites will arrive with the corresponding implementation.
