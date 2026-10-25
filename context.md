# Project context

Updated 2026-10-25 (Asia/Karachi).

## Current milestone
M1 — Usable Inspection Interface and Local Persistence: implementation complete and locally verified. M0 is complete and already deployed. M1 deployment verification is pending the implementation push and Actions run; do not claim the deployed origin has M1 until verified. No M2 work has started.

## Implemented functionality
- Explicit Try Fieldnest initializes three fictional local demo properties atomically, only once.
- My work shows inspection status and checklist progress. Property details open a four-section, eight-check predefined form with optional observations and final review.
- Choices save immediately; notes use a 250 ms trailing debounce. Serial session writes coalesce intervening edits. Success appears only after Dexie acknowledges the transaction.
- Drafts persist through refresh/reopening storage. Available inspections can be edited and completed offline after static resources are cached.
- Missing answers prevent completion with actionable feedback. Completed demo records are immutable local review copies, not synchronized submissions.
- Activity reflects latest acknowledged device records. Settings offers persistent-storage requests and JSON export, with clear browser storage limits.
- Unsaved sessions survive route changes; failures retain memory, expose recovery links globally and offer retry/download. Browser exit warnings and PWA update protection reduce accidental loss of unacknowledged work.
- Local revision checks reject stale tab writes without overwriting newer records. Retained stale drafts can be downloaded, then explicitly discarded to load the newer device copy.

## Architecture and key paths
src/domain/inspection.ts: checklist, models and validation.
src/persistence/database.ts: Dexie schema v1, atomic demo seed and version-checked local writes.
src/persistence/draftSession.ts: serialized autosave, debounce, acknowledgment and recovery across route changes.
src/persistence/useInspections.ts: reactive acknowledged record queries.
src/pages/: Work, Inspection, Activity, Settings and About.
src/components/LocalData.tsx and SystemNotice.tsx: storage recovery, downloads, exit/update protection.
e2e/inspection.spec.ts: complete browser workflows and failure scenarios.

fieldnest-demo-v1 is exclusively a fictional-demo database; M2 must create separate account-scoped caches. Local revision is not a server version. No Supabase client, authentication, SQL migration, remote queue, server sync or server conflict implementation exists. docs/ARCHITECTURE.md explains save timing, transactions, schema upgrade expectations and recovery. docs/SYNC_PROTOCOL.md remains future design intent.

## Verification executed for M1
- npm install dexie dexie-react-hooks; npm install -D fake-indexeddb: succeeded, audit reported zero vulnerabilities.
- npm run typecheck: passed.
- npm run lint: passed with no warnings after separating the storage query hook from UI components.
- npm test: passed, 13 tests across 3 files. Covers one-time/concurrent seeding, storage reopen, transactional rollback, stale revisions, validation, completion immutability, delayed save acknowledgment, coalescing/debounce, failed-save retry, failed completion and navigation.
- npm run build: passed. Main JS ~125.59 KiB gzip; static precache 11 entries (~418.70 KiB).
- npm run test:e2e: passed, 10 tests across desktop Chromium and mobile emulation. Covers /fieldnest/ assets/manifest/scope, offline reload, keyboard/direct routes, draft refresh recovery, immediate navigation, offline edits/completion, injected IndexedDB quota errors and two-tab stale-draft preservation/download/explicit discard.
- Desktop work-list and mobile form screenshots visually reviewed (ignored artifacts in test-results).
- Earlier test failures were an obsolete M0 copy assertion and an exact-text locator that included nested save-status explanation. Corrected the assertions; final tests were actually executed and passed.

## Limitations and known issues
Only acknowledged IndexedDB writes survive refresh/crash. An unsaved in-memory buffer can be lost on forced close or mobile OS termination; beforeunload is best effort. Browser deletion/eviction, private browsing and device loss remain limits. Persistent storage is not a backup. JSON downloads have no in-app import. No destructive reset/cleanup is exposed. Real mobile hardware, Safari/Firefox and native PWA installation prompts have not been verified. No backend/database synchronization tests apply before M2/M3. No external setup is needed for the local demo.

## Git and deployment
main tracks origin/main at https://github.com/abbasikhadija/fieldnest.git. HTTPS pushes are authorized; no GitHub CLI login is necessary. Pages uses GitHub Actions. M0 deployment run 40171118430 succeeded for commit 80b1b90 and its four deployed-origin tests passed. Prior foundation commits include 3df8b26, 7bf352b and ccff88d. The M1 implementation commit is named `feat: implement offline inspection drafts and local demo`; deployment evidence will be appended after verification. No force-push or history rewrite is authorized.

## Next milestone
M2 — Real Database, Authentication, and Authorization. Begin only on a new instruction. Read MASTER_PROMPT.md and all project context first. Establish reproducible Supabase/PostgreSQL migrations, assignments, two authorized test users, Auth, RLS, input validation and actual database integration tests. Protect account-scoped caches and preserve unsynchronized work on sign-out. Do not implement server synchronization until M3.
