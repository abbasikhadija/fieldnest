# Fieldnest

**Your work. Saved wherever you are.**

An offline-first property inspection app for people working away from a dependable connection.

[Try Fieldnest](https://abbasikhadija.github.io/fieldnest/) · [Source](https://github.com/abbasikhadija/fieldnest)

## Local demo

Choose **Try Fieldnest** to create three fictional property assignments on this device. Open a property, answer the eight predefined checks, add observations and review your inspection. You can leave an incomplete draft and return later. Once every check is answered, complete it to keep a read-only local result.

Choices save immediately; notes save after a short pause. Wait for **Saved on this device** before closing or refreshing. Once the app has been cached, available inspections can be edited and completed offline. Activity shows acknowledged local saves. Demo records are never sent to a server.

Storage errors keep your latest edits in the current tab with retry/download actions. If another tab saved a newer copy, Fieldnest preserves your draft and asks you to download it before explicitly discarding it to load the device copy. Settings can request persistent storage and download saved records as JSON. In-app import is not available yet.

Browser data can be deleted or evicted; private browsing and device loss can remove local records. Unacknowledged edits held in memory can be lost on a crash or forced close. Keep separate copies of important work. Persistent storage and browser exit warnings are best effort, not backups.

Connected accounts download assigned inspections, save drafts and complete cached work offline, then synchronize through a version-checked Supabase transaction. Device saves and server acceptance have separate status messages. Pending operations survive refresh and lost responses; demo records stay separate. Hosted M3 synchronization requires the new migration: see [backend setup](docs/BACKEND_SETUP.md#m3-hosted-upgrade-required-before-hosted-synchronization). Conflicts preserve both copies; manual resolution is the next milestone.

## Develop

Use Node.js 22.12 or newer in the Node 22 release line:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/fieldnest/. No credentials are needed for the demo. `.env.example` reserves browser-safe Supabase configuration for M2; never put secret/service-role keys in Vite variables.

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover local transactions, save acknowledgment/recovery, auth identity races and validation. The real PostgreSQL suite tests SQL constraints and RLS. Docker-capable CI also starts actual Supabase Auth/PostgREST and tests password sign-in, shared assignments, unauthorized access and browser sign-out/account isolation. Browser tests exercise desktop/mobile forms, offline refresh/completion, injected storage failure, navigation and two-tab stale drafts. The suite runs against the production build under /fieldnest/.

## Deployment

GitHub Pages uses GitHub Actions as its source. Pushes to main verify types, lint, unit tests, production build and browser tests before deploying. Pull requests only verify. Deployment also requires the real Supabase integration job to pass. Hash routes avoid server rewrites. The manifest, service worker and static assets are scoped to /fieldnest/. No backend is hosted on Pages. Supabase project URL and publishable/legacy anon key can be set as GitHub Actions repository variables; privileged keys are rejected before bundling.

To test the actual deployed version from PowerShell:

```powershell
$env:FIELDNEST_BASE_URL = 'https://abbasikhadija.github.io/fieldnest/'
npm run test:e2e
Remove-Item Env:FIELDNEST_BASE_URL
```

M3 frontend deployment is verified: [GitHub Actions run 40180760002](https://github.com/abbasikhadija/fieldnest/actions/runs/40180760002) passed strict checks, 40 unit tests, 34 real PostgreSQL tests, 13 actual Supabase Auth/API tests and four connected desktop/mobile browser tests before deployment. All 12 standard browser regressions also passed independently against the public site. Offline completion, lost-response replay and retrieval by a second authorized account were tested against disposable Supabase. The hosted project still needs the new M3 migration before cloud synchronization; see [upgrade instructions](docs/BACKEND_SETUP.md#m3-hosted-upgrade-required-before-hosted-synchronization).

## Engineering notes

MASTER_PROMPT.md defines requirements and sequential milestones. AGENTS.md provides development instructions. docs/ARCHITECTURE.md explains local persistence and recovery; docs/DECISIONS.md records tradeoffs; docs/SYNC_PROTOCOL.md documents the implemented synchronization contract. docs/BACKEND_SETUP.md explains Supabase configuration, private local test users and hosted setup. Server guarantees are exercised by actual PostgreSQL and disposable Supabase tests; browser mocks alone do not establish them.
