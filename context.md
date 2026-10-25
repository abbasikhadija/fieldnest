# Project context

Updated 2026-10-25 (Asia/Karachi).

## Current milestone
M3 — Durable Synchronization Engine: implemented; local strict checks, 40 unit tests and 34 real PostgreSQL tests pass. All 12 local production browser regressions also pass. Disposable real-Supabase CI verification is pending. M0–M2 remain complete. Hosted M3 requires applying only the new migration; no hosted schema changes have been made. The M2 and pending notes below are historical; the M3 entry at the end is authoritative.

## Completed prior milestones
M0 established and deployed the frontend/PWA foundation. M1 implemented the fictional local demo, fixed checklist, durable device drafts, review/completion and recovery. M1 commit 2e55a6c deployed successfully in Actions run 40172186264 and passed all 10 then-current deployed-origin browser tests. M1 verification documentation commit: 2aaeb84. Preserve that functionality.

## M2 implementation
- Optional Supabase configuration and lazy-loaded /account workspace. Missing backend configuration leaves the public local demo working and explains administrator setup.
- Email/password sign-in, online getUser verification, auth change invalidation, stale-response protection and safe sign-out failure handling. Auth changes hide private identity synchronously before deferred verification; account views cancel pending requests and remount by verified user ID.
- Paginated authorized assignment reads (25 per page) and read-only shared server record details. Runtime validation rejects malformed responses. Connected inspection data remains in memory only; no connected record cache or edits exist in M2. Demo IndexedDB sessions and unsaved work are never deleted on sign-out.
- Supabase CLI local project configuration, versioned PostgreSQL migration, fictional seed properties and a local-only private user setup script. Two generated local test users share Willow Court; passwords stay in ignored .local/accounts.json, never frontend code or Git.
- inspections, inspection_assignments and inspection_records tables; foreign keys, answer/notes/completion/version checks, assignment/due-date indexes and RLS. Assignees can read shared records and their own assignment rows. Anonymous access and all direct browser writes/self-assignment are denied.
- Native PostgreSQL integration runner plus actual Supabase Auth/PostgREST and browser suites for Docker-capable CI. Deployment requires both the normal verification job and actual Supabase integration job to pass.
- Browser-safe GitHub Actions variables supported. Vite rejects incomplete configuration, unsafe URLs and secret/service-role keys before bundling.

## Key paths
supabase/config.toml; supabase/migrations/20261025000100_inspection_foundation.sql; supabase/seed.sql.
src/auth/: verified identity lifecycle and Supabase adapter.
src/remote/: config, schema contracts, validation and read APIs.
src/pages/Account.tsx: separate online connected workspace.
scripts/test-database.mjs; tests/database/: actual PostgreSQL RLS/constraint tests.
scripts/test-supabase.mjs; scripts/seed-local.mjs; scripts/build-local.mjs; e2e-connected/: actual local Supabase integration/browser tests.
docs/BACKEND_SETUP.md: exact local/hosted setup, private fixtures and security boundaries.

## Verification executed locally
- Dependency installation succeeded; npm audit reported zero vulnerabilities.
- npm run typecheck: passed.
- npm run lint: passed, no warnings.
- npm test: passed, 26 tests across 6 files. Includes existing local draft tests and new identity-race/sign-out/config/remote-validation checks.
- npm run test:db: passed, 20 actual PostgreSQL 18.1 authorization/constraint tests. Runner used a temporary loopback cluster, applied real migration/seed, then shut it down and removed only that temporary directory. Its minimal auth.uid/role interface is not a substitute for actual Supabase Auth testing.
- npm run build: passed; main JS ~125.79 KiB gzip, lazy account chunk ~62.82 KiB gzip, 12 static precache entries (~656.38 KiB).
- npm run test:e2e: passed, 12 tests on desktop Chromium/mobile emulation, including full offline demo regressions and connected/demo workspace separation.
- Production build with an intentionally invalid privileged-key fixture was rejected before bundling, as expected.
- npm run test:auth: blocked locally because no Docker-compatible runtime/local Supabase stack is available. The earlier CLI path assumption was corrected to invoke the installed CLI's Node entry point; the remaining failure is the unavailable local stack, not a fabricated successful integration.
- Connected browser suite is configured separately; it requires actual local Supabase and generated private fixtures. It has not yet been executed locally. CI execution evidence will be recorded after the push.

## Security and limitations
Connected records are online-only/read-only in M2. They are not stored in the demo database, localStorage or a service-worker API cache. Supabase's login session persists under a project-scoped browser storage key; this does not provide strong confidentiality on shared/compromised devices. Sign-out hides records immediately and preserves demo drafts. Failed sign-out remains visibly blocked until retry.

No remote edits, outbox, idempotent mutation function, retry engine or server conflict workflow exists. Server version is schema groundwork only. M1 browser storage/eviction/private-mode/device-loss limitations still apply. JSON demo exports have no in-app import. Real hardware, Safari/Firefox and native installation prompts remain unverified.

## Git and deployment
main tracks origin/main at https://github.com/abbasikhadija/fieldnest.git; HTTPS pushes are authorized. M2 implementation commit 9dd74b4 (`feat: establish Supabase authentication and authorized inspections`) and correction 7ba8cb4 (`fix: enable existing-user email login while blocking signup`) are committed and pushed. GitHub Pages remains the frontend host. CI has real PostgreSQL and disposable local Supabase verification gates. The user created hosted project lxoknylvpjvqaqsdindf, reported successful SQL-editor application of the M2 migration/seed and first-user assignment, and supplied its browser-safe publishable key. Project URL and publishable key are configured as GitHub Actions repository variables. No privileged hosted credentials were supplied. No force-push or history rewrite is authorized.

## External setup and next steps
Follow docs/BACKEND_SETUP.md: create a private Supabase project, apply the checked-in migration using CLI login/link/db push (never reset production), disable public signup, create two private Auth users and assign a property, then set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY as GitHub Actions repository variables and redeploy. No privileged key belongs in a VITE_ variable or chat. Verify actual hosted sign-in, authorized reads, unassigned-user denial and logout before declaring hosted integration complete.

Next development milestone: M3 — Durable Synchronization Engine. Begin only on a new instruction. Read MASTER_PROMPT.md, AGENTS.md and project docs first. Finalize the sync protocol and implement atomic/idempotent version-checked server processing, account-scoped local persistence, persistent operations, retries and durable acknowledgment handling with real failure tests. Do not begin M4 conflict resolution in that milestone.

## M2 CI correction
The first real-Supabase CI run (40174233787, commit 9dd74b4) passed the normal verification job but failed actual sign-in with email_provider_disabled. The local config had disabled auth.email.enable_signup as well as global signup; that also disabled the email provider. Correction 7ba8cb4 keeps the email provider enabled while auth.enable_signup remains false. Added a real API assertion that public signup stays blocked. Deployment was gated and did not publish the failed build. The corrected run passed; see final evidence below.

## Final M2 integration and deployment evidence
GitHub Actions run https://github.com/abbasikhadija/fieldnest/actions/runs/40174570852 completed successfully for commit 7ba8cb42cd8c14de82a83f87b54c0e3c0b332b1a. Both verify and verify-auth passed, then deploy passed. The disposable Supabase job actually started the real stack, passed 12 Auth/PostgREST integration tests, created two private fixture users, built the configured local frontend and passed 2 connected-browser tests (desktop/mobile). Those browser tests verified sign-in as both users, shared authorized server record reads, demo/server answer isolation, cross-tab sign-out and preservation of existing demo drafts. Public signup denial was also tested against actual Auth. The stack was shut down after the job.

The public site returned HTTP 200 and served index-Cg11WuuG.js. All 12 public-site browser regression tests passed with FIELDNEST_BASE_URL=https://abbasikhadija.github.io/fieldnest/. CI's empty-string Vite configuration produces a different asset hash from the local undefined configuration; deployed-origin feature tests and the successful workflow establish the deployed version, not a guessed local filename match.

The earlier local Docker/Auth execution limitation remains true for this machine; CI results supersede the previously pending full-stack checks. Hosted Supabase sign-in remains unverified because no production project/configuration has been supplied. This is the only external account setup needed for hosted M2 use. Exact instructions: docs/BACKEND_SETUP.md. No privileged production credentials were used or committed. Final deployment evidence is saved in a documentation-only follow-up commit; working application code is the verified 7ba8cb4 implementation. Next step is hosted setup/verification, then M3 only when requested.

## Hosted Supabase connection — 2026-10-25
User chose to finish hosted M2 setup before M3. Project: https://lxoknylvpjvqaqsdindf.supabase.co (dashboard project lxoknylvpjvqaqsdindf). User reported Success for the initial migration and fictional seed run in the SQL Editor, created a private Auth user and assigned Willow Court to it. This is user-reported administrative setup, not independently verified authorized account access.

Configured GitHub Actions repository variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY using the supplied browser-safe publishable key; the key itself is not duplicated in this documentation. No application source changes were necessary. Dispatched workflow run https://github.com/abbasikhadija/fieldnest/actions/runs/40178545469 for a819bf9. verify, verify-auth and deploy all succeeded. All 12 default browser tests passed against the newly configured public deployment; a separate fresh-browser check verified the real sign-in form renders at https://abbasikhadija.github.io/fieldnest/#/account.

Hosted Auth settings confirmed email provider enabled, but public signup was still enabled when checked. Anonymous REST requests to inspections, inspection_assignments and inspection_records each returned HTTP 401. No production user password was requested or used, and no authenticated hosted records were accessed. Private-user login, assigned record visibility, second-user sharing and hosted logout remain unverified until the user tests them privately.

User requested help locating signup controls. Next manual step: Authentication > Sign In / Providers > User Signups > disable Allow new users to sign up; keep Email enabled; save if shown. Then sign in to the deployed /account page using the privately created account and confirm Willow Court is visible. Do not claim full hosted M2 acceptance or begin M3 yet.

Important migration continuity: the hosted schema was applied manually through SQL Editor, not CLI db push. Before applying any later CLI migration, inspect/verify the existing schema and migration history. If the baseline schema exactly matches 20261025000100 and that version is missing from CLI history, mark it applied using migration repair rather than executing the initial CREATE statements again. See docs/BACKEND_SETUP.md. Never reset the hosted database to reconcile history.

## Hosted M2 acceptance completed — 2026-10-25
The user privately confirmed successful sign-in to the deployed site, visibility of assigned 12 Willow Court, opening its checklist, and successful sign-out returning to the sign-in form with inspection details hidden. These authenticated hosted checks are user-confirmed; the agent did not receive or use the user's password. After the user disabled public signup, an independent GET of the hosted Auth settings confirmed external.email=true and disable_signup=true.

M2 hosted setup is now closed. Existing evidence also includes hosted anonymous table requests denied with HTTP 401, 12 deployed browser regressions passed, and full real Auth/RLS/two-user/browser tests passed in disposable CI. A second hosted user/unassigned hosted-user check was not performed; shared-user and unauthorized-identity behavior were verified in real Supabase CI, not misrepresented as hosted checks. No source/runtime change was needed for this closure; only documentation changed and git diff --check was run. No automated suite was rerun for the documentation-only change.

Next: M3 only on a new development instruction. Preserve the reminder that the initial hosted migration was applied through SQL Editor: reconcile verified baseline migration history before a later CLI db push; never reapply initial CREATE statements or reset hosted data blindly.

## M3 implementation — 2026-10-25
Implemented only M3. The starting tree was clean on main tracking origin/main. M2, including user-confirmed hosted acceptance, was already complete.

- Designed the concrete operation/RPC/receipt/lease/acknowledgment protocol before writing implementation; see docs/SYNC_PROTOCOL.md.
- Added account/project-scoped Dexie caches and immutable persistent operations. Record save/outbox changes, acknowledgment/version advancement/queue cleanup, newer-revision follow-up operations, lease claims and retry state use transactions. Existing fictional demo storage stays separate.
- Connected checklist editing reuses DraftSession autosave, completion, dirty-memory retention and unload/update safeguards. Cached work reopens offline using the locally retained Auth session. Sign-out hides records immediately, never deletes pending work and never exposes another account's cache. Device-save and server-acceptance statuses stay distinct. Storage errors and stale tabs retain buffers with download/retry/explicit discard recovery.
- Added M3 PostgreSQL migration 20261025000200_durable_sync.sql: private account-scoped immutable receipts and authenticated apply_inspection_operation RPC. Request validation, assignment authorization on every call/replay, operation-ID mismatch rejection, record locks, version checks and mutation/receipt atomicity. Direct browser writes remain denied. Accepted replay returns exactly the original acknowledgment; conflict results preserve server/local copies. No M4 comparison or resolution UI was added.
- Worker leases operations for 45 seconds, imposes 20-second request deadlines, processes at most ten per run, and persists exponential retry delays with jitter. Startup/online/visibility/manual Sync and active timers resume work. Permanent errors stop automatic retries; explicit Sync safely retries the same ID after administrative recovery. Conflicts remain stopped for M4. Other inspections continue after one fails.
- Updated architecture, protocol, decisions, specification, README, product copy and exact hosted-upgrade instructions. No new runtime dependency or privileged frontend credential was introduced.

Local verification actually executed:
- npm ci: passed, audit reported zero vulnerabilities.
- npm run typecheck and npm run lint: passed after correcting an unused type import during component extraction.
- npm test: passed, 36 tests in 7 files. New tests cover stable operation persistence, account isolation, immutable snapshots/newer edits, lost acknowledgment retries, acknowledgment-write rollback, leases/restart, deadlines, explicit blocked retry, conflict preservation and failure isolation. Updated an existing activity-copy assertion to reflect connected synchronization availability.
- npm run test:db: passed, 20 existing authorization/constraint tests plus 14 new real PostgreSQL synchronization tests. Includes real simultaneous duplicate and competing writers on independent database connections. Temporary loopback PostgreSQL 18.1 cluster stopped/removed after testing; no hosted database touched.
- npm run build: passed, /fieldnest/ asset/PWA output generated; main JS ~125.89 KiB gzip, lazy account ~65.54 KiB gzip; 12 static precache resources (~664.97 KiB). Final build details may change if CI uncovers a fix.
- npx playwright install chromium: succeeded. First npm run test:e2e run passed 11/12; one mobile existing-demo test timed out waiting for navigator.serviceWorker.ready. Full final regression rerun is pending; do not infer browser success from build output.
- npm run test:auth: attempted and blocked locally: no Docker-compatible runtime/running disposable Supabase stack. No local real-Auth or connected-browser success claimed. CI will run the actual Auth/PostgREST and four connected desktop/mobile browser cases before deployment.

Hosted setup remains external: the configured M2 project must receive ONLY supabase/migrations/20261025000200_durable_sync.sql, with baseline/history reconciliation before CLI db push because M2 was applied manually. Exact dashboard and CLI steps are in docs/BACKEND_SETUP.md, section M3 hosted upgrade. Never reset hosted data or replay the initial migration/seed. Missing RPC is surfaced as an administrator-setup error while device work remains recoverable; after setup, Sync saved work retries the retained operation. No hosted M3 integration or deployment has yet been verified.

Next milestone after M3 verification: M4 — Conflict Detection and Resolution, only on a new instruction. Known limits: manual server-conflict resolution intentionally deferred; no JSON import; browser storage can be cleared/evicted/lost; offline account identity is local session continuity, not live authorization or encryption; real hardware/Safari/Firefox remain unverified. Receipt retention is indefinite except explicit Auth-account deletion. Downloaded revoked assignments may remain on their original account's device for recovery; server authorization is rechecked before every mutation and is never inferred from the cache.

Final local browser rerun: all 12 desktop/mobile production regressions passed (24.3 seconds), including /fieldnest/ assets, manifest/scope, offline reload, demo completion, stale tabs and storage-failure recovery. The invocation included --workers=1, but this npm/PowerShell environment did not forward it; Playwright actually used four workers. The earlier service-worker readiness timeout did not recur.

M3 CI first-run evidence: run 40180425639 for ea94c61 passed the normal verify job and all 13 actual Supabase Auth/PostgREST tests, including idempotent RPC replay and second-user retrieval. Both new desktop/mobile offline-completion/lost-acknowledgment browser scenarios passed. The existing account-isolation browser cases failed because a second assertion still expected the retired M2 wording Server draft · Version 1; corrected it to the actual acknowledged M3 status without weakening identity/demo-isolation assertions. Deployment was gated and skipped. Final rerun pending.

Final review improvement: navigator.onLine can remain true during real network loss. Auth now permits cached session continuity on retryable transport errors, while explicit online JWT/session rejection never falls back to cached identity. Added four adapter tests; npm test passed 40 tests across 8 files, typecheck/lint/build passed after correcting the AuthApiError test constructor. Current build main gzip ~125.89 KiB, account ~65.50 KiB; 12 static precache entries ~665.02 KiB. The temporary ignored CI-inspection helper initially caused local eslint no-undef errors; fixed that helper's environment annotation. No CI helper, Git credential or local account fixture is staged.
