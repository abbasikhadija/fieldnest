# Project context

Updated 2026-10-25 (Asia/Karachi).

## Current milestone
M2 — Real Database, Authentication, and Authorization: implementation locally verified. Hosted Supabase setup is not configured. Real local Supabase Auth/PostgREST and connected browser tests are committed for Docker-capable CI, with results pending the implementation push. No M3 synchronization work has begun. Do not claim hosted sign-in is available until its external setup is completed and verified.

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
main tracks origin/main at https://github.com/abbasikhadija/fieldnest.git; HTTPS pushes are authorized. M2 implementation commit will be named `feat: establish Supabase authentication and authorized inspections`. GitHub Pages remains the frontend host. CI has real PostgreSQL and disposable local Supabase verification gates. Hosted project credentials have not been supplied; no hosted database was created, migrated or accessed. No force-push or history rewrite is authorized.

## External setup and next steps
Follow docs/BACKEND_SETUP.md: create a private Supabase project, apply the checked-in migration using CLI login/link/db push (never reset production), disable public signup, create two private Auth users and assign a property, then set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY as GitHub Actions repository variables and redeploy. No privileged key belongs in a VITE_ variable or chat. Verify actual hosted sign-in, authorized reads, unassigned-user denial and logout before declaring hosted integration complete.

Next development milestone after M2 external setup/verification: M3 — Durable Synchronization Engine. Begin only on a new instruction. Read MASTER_PROMPT.md, AGENTS.md and project docs first. Finalize the sync protocol and implement atomic/idempotent version-checked server processing, account-scoped local persistence, persistent operations, retries and durable acknowledgment handling with real failure tests. Do not begin M4 conflict resolution in that milestone.

## M2 CI correction
The first real-Supabase CI run (40174233787, commit 9dd74b4) passed the normal verification job but failed actual sign-in with email_provider_disabled. The local config had disabled auth.email.enable_signup as well as global signup; that also disabled the email provider. Corrected the local config to keep the email provider enabled while auth.enable_signup remains false. Added a real API assertion that public signup stays blocked. Deployment was gated and did not publish the failed build. Full integration results are still pending the corrected CI run.
