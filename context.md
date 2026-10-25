# Project context

Updated 2026-10-26 (Asia/Karachi).

## Current milestone
M4 — Conflict Detection and Resolution: implementation recovered from ff15102; all backend and connected-browser CI gates passed in run 40188243282. The preserved conflict-screen styles and final verification documentation are being completed without restarting M4. M3's hosted migration was applied successfully according to the owner; online synchronized edits and refresh recovery were user-confirmed. The owner explicitly skipped the remaining manual hosted connected-offline/second-device check and authorized M4. Keep that manual check unverified; actual offline/second-account acceptance already passed in disposable Supabase CI. M5 has not begun.
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

Next development milestone: M4 — Conflict Detection and Resolution, only on a new instruction. First finish the hosted M3 upgrade and private cloud sync checks described in BACKEND_SETUP.md. Do not repeat M3 implementation or overwrite pending local/server conflict snapshots.

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

## Final M3 verification and deployment — 2026-10-25
GitHub Actions run https://github.com/abbasikhadija/fieldnest/actions/runs/40180760002 succeeded for 8e3827b2b83ff76ec9848324f1031a8dd96ac12c. verify, verify-auth and deploy all passed. CI actually executed typecheck, lint, 40 unit tests, all 34 native PostgreSQL tests, the production build and 12 standard browser tests. The independent disposable Supabase job passed all 13 real Auth/PostgREST integration tests, seeded private local users, built the configured frontend, and passed all four connected desktop/mobile browser tests (15.0 seconds). These include completed offline work surviving reload, an intentionally dropped response after server commit, identical-ID retry, durable acceptance, retrieval by a second authorized account, sign-out hiding private data, cross-tab logout and demo-draft isolation. Its disposable stack was shut down.

The public URL https://abbasikhadija.github.io/fieldnest/ returned HTTP 200. Its actual index-BJSQH-Da.js and index-DpOuQzlT.css assets returned HTTP 200 with JavaScript/CSS MIME types. All 12 standard browser regressions passed against this deployed HTTPS origin (21.2 seconds), including scoped PWA/offline navigation and the complete existing demo workflow. This verifies the frontend deployment; it does not claim that hosted M3 SQL or authenticated cloud synchronization has been configured.

Commits: ea94c61 implements M3; 8e3827b corrects account-status regression assertions and adds tested cached-account continuity during retryable transport failures. Both were intentionally committed and pushed to origin/main without rewriting history. This final evidence update changes documentation only and uses a skip-ci commit because the exact application code has already passed all gates and deployed; git diff --check is the relevant documentation check. No passwords, service-role credentials, .local helpers or generated local accounts are committed.

Remaining external step: the project owner must apply ONLY supabase/migrations/20261025000200_durable_sync.sql to the existing hosted project, following docs/BACKEND_SETUP.md's transaction/history instructions, then privately verify cloud sync and second-device retrieval. No hosted administrator credentials were available or requested. The hosted M2 baseline was manually applied; do not rerun it or reset data. Users encountering the missing-RPC setup message keep their device work and can use Sync saved work after the upgrade. This is the only hosted M3 setup blocker. Real Auth/mutation/offline/second-user acceptance is already verified against disposable Supabase CI.

Stop after M3. Next development instruction should target M4 — Conflict Detection and Resolution. Preserve the existing conflicting local/server snapshots and immutable receipts when implementing reviewed version-checked resolution.

## M3 continuation: account-bound requests and receipt checks — 2026-10-25
Inspection found that M3 had already been implemented/deployed in commits ea94c61 and 8e3827b, with evidence recorded by e14ccca. The working tree contained incomplete request-identity and acknowledgment-validation changes across src/remote/ and src/sync/. Preserved and completed those changes instead of repeating M3 or beginning M4.

Protected assignment downloads, record reads and uploads now capture a session token, verify that exact JWT belongs to the expected account, and explicitly attach that JWT to the protected request. Tests use the real Supabase request builder with a controlled fetch to change the client's active account between verification and dispatch, proving it cannot substitute another account's token. Wrong active sessions and aborted uploads send no protected request.

Acknowledgments are checked against the durable queue: matching inspection identity, expected next version, notes, status and answer values (independent of object key ordering). Backward conflict versions are rejected. Invalid receipts do not clear pending operations or change saved records. Finalization uses the queued revision rather than a caller's mutable claim. Added regression coverage for those cases plus atomic outbox-write rollback, ten-operation run bounds, interrupted worker restart and persisted capped backoff/jitter.

Actually executed: npm run typecheck passed; npm run lint passed; npm test passed (56 tests, 9 files); npm run test:db passed (20 authorization/constraint plus 14 synchronization tests on real PostgreSQL 18.1); npm run build passed (main ~125.89 KiB gzip, account ~65.62 KiB gzip, 12 precache entries ~665.70 KiB); npm run test:e2e passed all 12 desktop/mobile production regressions (24.9 seconds). git diff --check passed. No hosted schema or authenticated hosted data was changed. Real Supabase/connected-browser rerun will be performed by CI after the push; local Docker remains unavailable.

Commit subject for this continuation: `fix: bind synchronization requests to verified accounts`. Push remains authorized via origin/main. Hosted setup remains the existing M3 migration step in docs/BACKEND_SETUP.md; do not recreate M2, rerun the seed, or reset hosted data. Next development milestone stays M4 only after this M3 continuation is verified and when newly requested.

## Final M3 follow-up evidence — 2026-10-25
Commit 3de7f23 completes the existing uncommitted M3 fixes and additional durable-queue identity/revision checks. It was pushed without rewriting history. Run https://github.com/abbasikhadija/fieldnest/actions/runs/40183528823 completed successfully: verify, verify-auth and deploy all passed. The actual Supabase Auth/PostgREST and four connected desktop/mobile cases ran in the disposable Docker stack. The temporary environment-stage wait cleared normally; no protection setting or approval was changed.

The public origin returned HTTP 200. First public regression run passed 10/12; failures were net::ERR_NETWORK_CHANGED on mobile navigation and a service-worker-ready timeout in desktop Chromium. Reran the full suite using FIELDNEST_BASE_URL and `node node_modules/@playwright/test/cli.js test --workers=1 --timeout=60000`; all 12 passed in 33.5 seconds. Assertions were unchanged; the command explicitly serialized network traffic and allowed more time for remote loading. Local and CI runs had already passed all 12 with normal settings. Do not describe the initial live run as passing.

This final evidence commit changes documentation only, uses [skip ci] because the exact application code is already verified/deployed, and was checked with git diff --check. No passwords, privileged keys, local fixtures or generated artifacts are included. The hosted M3 migration remains unapplied/unverified by the agent: owner must follow docs/BACKEND_SETUP.md#M3-hosted-upgrade and apply only 20261025000200_durable_sync.sql, then privately test saved offline work, synchronization and second-device retrieval. Do not reset hosted data or replay the foundation/seed. Next milestone is M4 only after this external upgrade/verification and a new request.

## M4 implementation — 2026-10-25
Starting tree was clean at 97f2bba on main tracking origin/main. User explicitly authorized M4 after choosing to skip further manual hosted offline-sync testing. Do not repeat M3 setup or report the skipped test as complete. User had reported M3 SQL transaction Success, a completed synchronized server inspection (version 10), online refresh recovery, and local-demo offline refresh recovery; these are distinct user-confirmed observations, not an agent-authenticated production test. M4 makes no hosted database changes and requires no new Supabase migration.

Implemented:
- ConflictReview compares checklist values, notes and lifecycle state in saved local/server copies. Differences are textual, version-labelled and mobile-responsive. Server refresh preserves device edits; offline review clearly labels its last-known snapshot. Literal notes are quoted to distinguish empty placeholders.
- Explicit Use server copy or Apply my device copy decisions; no automatic merge. A fresh operation UUID and reviewed server version go through the existing M3 RPC. A server change after review creates another conflict, not an overwrite. Completed server inspections cannot be replaced.
- Dexie schema v2 adds resolutions without deleting v1 records/outbox. A decision transaction checks current state/local revision/server version, archives both snapshots and the blocked original operation, replaces/removes that operation and updates the local record atomically. Concurrent/stale local tabs cannot both resolve. Recovery copies survive reload and are available for JSON download. No automatic pruning/import/restore is introduced.
- Unsaved in-memory edits must be downloaded or explicitly discarded before reviewing the saved conflict; no implicit buffer loss. Existing demo, synchronization, sign-out and account isolation paths are preserved.
- Added real SQL resolution cases, real Supabase HTTP resolution/replay coverage and two-account desktop/mobile browser cases for both choices, repeat conflicts, refresh recovery and archives. CI stores only fictional conflict-screen PNGs for visual review, never local credentials or traces.

Local commands actually executed:
- npm run typecheck: passed.
- npm run lint: passed without warnings.
- npm test: passed 66 tests across 10 files. Ten M4 tests cover raw differences, fresh immutable operations/archive/reopen, server-copy adoption, competing local decisions, stale review rejection, atomic rollback for archive/outbox failures, repeat conflicts, completed server protection and non-destructive schema upgrade.
- npm run test:db: passed 37 real PostgreSQL 18.1 tests (20 authorization/constraints, 17 synchronization/resolution). Includes actual two-connection/two-authorized-user competing resolutions.
- npm run build: passed; main JS ~125.90 KiB gzip, account chunk ~68.00 KiB gzip, 12 precache entries (~676.94 KiB). CI will build the final product copy changes again.
- npm run test:e2e: passed all 12 existing desktop/mobile regressions (31.0s).
- The initial M4 archive assertion incorrectly expected an active claimed operation; it was corrected to the actual stopped immutable operation and optional owner semantics. Final unit tests passed; initial failing runs are not counted as successful.
- Connected browser tests and real Auth/PostgREST additions require Docker; local Docker remains unavailable. Those tests have not yet been executed here and must pass in CI before deployment. Their results will be appended below.

Important files: src/domain/conflict.ts; src/sync/ConflictReview.tsx; RecoveryHistory.tsx; database.ts; conflictResolution.test.tsx; e2e-connected/conflicts.spec.ts; tests/database/synchronization.mjs; docs/SYNC_PROTOCOL.md. No new dependency or privileged browser credential is introduced.

Git commit subject: `feat: add reviewed conflict resolution and recovery history`. Push is authorized. Next milestone after M4 verification is M5 — Reliability and Failure Recovery, only when explicitly requested. Known limits remain browser storage eviction/deletion/device loss, no in-app JSON import, no completed-server overwrite, and unverified real mobile hardware/Safari/Firefox. Hosted manual connected-offline verification was explicitly skipped; do not block M4/M5 solely by repeating that request.

## M4 interrupted-session recovery — 2026-10-26
Recovered rather than restarted: ff15102 was already committed and pushed, with the complete comparison UI, version-checked resolution transactions, recovery history, schema upgrade and automated conflict/concurrency coverage. Its GitHub Actions run 40188243282 passed verify, verify-auth and deploy. Job logs independently confirmed 66 unit tests, 37 real PostgreSQL tests, 14 real Supabase Auth/PostgREST tests and eight connected browser tests. These include the two-authorized-client offline conflict, resolution, repeated conflict after a server edit during review, reload recovery and second-client retrieval. No missing server concurrency mechanism was found.

The only starting uncommitted change was src/styles.css, containing the intended M4 responsive comparison/choice/history styling. It was preserved in full. Prior CI screenshots confirmed the deployed conflict view lacked that styling; this continuation finishes its inclusion. Only src/styles.css, README.md and context.md are changed by this continuation. No working M0–M3 source, dependency, migration or sync engine was rewritten. Architecture and protocol already matched the implementation and needed no further edits.

Fresh execution: type checking and ESLint passed; all 66 unit tests passed; all 37 native PostgreSQL 18.1 tests passed. The pre-continuation deployed origin passed all 12 desktop/mobile regressions (38.1s). Production build and final styled browser results are recorded below after completion. Real Supabase remains unavailable locally without Docker; its actual integration/browser execution was verified from successful CI, not represented as a local run. A new CI run will verify the completion commit before deployment.

Commit requested for this continuation: feat: implement inspection conflict resolution. Existing commits are retained unchanged. No cloud migration or account setup is needed for M4. Remaining limitations: manual hosted offline/second-device testing was skipped by the owner; real mobile hardware/Safari/Firefox remain unverified; browser data deletion/eviction can remove local history; exports have no in-app import. Next milestone is M5, which has not begun.

Final styled local build passed (12 precached assets, 676.95 KiB); all 12 production-build desktop/mobile browser regressions passed in 17.5s, including /fieldnest/ assets, manifest scope and offline reload. git diff --check passed. The completion commit includes only the preserved stylesheet and the two documentation files. Push/deployment evidence will follow without rewriting this commit.
