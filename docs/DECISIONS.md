# Decisions

- M0: Hash routing and fixed /fieldnest/ base meet repository-subpath hosting without a custom 404 script. URLs use /fieldnest/#/activity.
- M0: Tailwind v4 Vite integration plus shared CSS primitives keeps the visual system small and readable.
- M0: Prompt-based service-worker updates avoid reloading future unsaved forms without user action. Only static resources are precached.
- M0: Planned screens explicitly describe unavailable functionality. No fabricated inspection records, save indicators, sync success, or sign-in controls.
- M0: Dexie and Supabase implementation/dependencies are deferred to their milestones; the required stack is unchanged.
- M0: Created a project-local Git repository because the inherited repository root was the Windows user directory. No parent files were staged.
- M0 follow-up: Preserve the router fragment when activating the keyboard skip link. Regression tests exercise a directly loaded Settings URL and reload.
- M0 follow-up: Reuse the production browser suite for deployed-origin verification via FIELDNEST_BASE_URL. No public-origin success is inferred from local results.
- Planned: record-level concurrency and manual resolution favor understandable recovery over automatic merging. Validate with real PostgreSQL transactions before claiming correctness.

- M1: Isolate fictional demo data in fieldnest-demo-v1. Seed assignments and the initialization marker atomically, only on explicit Try Fieldnest. Keep future authenticated data in separate account-scoped storage.
- M1: Serialize local writes and coalesce input while in flight; debounce notes by 250 ms while saving choices immediately. Retain editing sessions across routes and never acknowledge before the Dexie transaction completes.
- M1: Use local revision checks to prevent a dirty tab overwriting a newer local record. On rejection retain edits, offer JSON download and require confirmation before discarding them. This supports local integrity without implementing the later server conflict milestone.
- M1: Complete only after flushing valid answers; completed demo records are immutable review copies. Fail is an acceptable finding and Not applicable is an explicit answer.
- M1: Provide JSON export and an opt-in persistent-storage request, with honest eviction/deletion/private-browsing limitations. Exports have no in-app import yet. Never add a destructive reset as automatic storage recovery.

- M2: Use invitation/administrator-provisioned password accounts and assignee relationships. No public sign-up, shared public login or tenant/organization framework.
- M2: Connected records are online-only/read-only and held in memory. This meets the database/auth foundation without introducing an incomplete synchronization mechanism. Demo data stays in its existing isolated Dexie database; later connected caches must be account-scoped.
- M2: Deny all direct browser writes, including self-assignment. Schema constraints still validate trusted administrative writes. M3 must add version-checked transactional mutation functions rather than loosen table grants.
- M2: Verify identity with Auth getUser; invalidate records immediately on auth events, defer network verification outside the callback lock and reject late responses. Hide private records even when a logout request fails. Never delete demo drafts during logout.
- M2: Run native PostgreSQL RLS tests without Docker when available, and independently run real Supabase Auth/PostgREST tests in Docker-capable CI. Neither mocked HTTP nor a minimal auth.uid interface alone is proof of end-to-end authentication.
- M2: Inject only project URL and publishable/legacy anon key through Vite/GitHub variables. Validate before bundling to catch accidentally configured service-role/secret keys. Privileged test keys stay inside disposable local test scripts and are not printed or exposed to frontend builds.

- M3: Keep at most one immutable operation per record. Later device edits remain dirty and are queued transactionally after the prior acknowledgment advances their base version; never rewrite a possibly delivered request.
- M3: Persist operation receipts indefinitely, scoped to Auth account and UUID. Check authorization before receipt lookup and compare the complete request on replay. Account deletion cascades receipts; no automatic retention expiry can break retry safety.
- M3: Use 45-second Dexie leases and 20-second deadlines to bound active work, with server idempotency protecting lease expiry/duplicate requests. Stop conflicts for M4 and preserve both snapshots; explicit retries unblock administrative errors without changing operation IDs.
- M3: Use the existing locally stored Auth session for offline access to that account's cached work. This is not live authorization or storage encryption. Online mutations reverify identity and assignment. Preserve pending records on logout and hide account content immediately.
- M3 follow-up: Bind protected HTTP requests to the exact verified JWT; verifying identity and then letting a mutable shared client choose a different token leaves an account-switch race.
- M3 follow-up: Treat the durable queued operation as the acknowledgment authority. Accepted receipts must match the queued payload and expected next version before any cleanup. Reject backward conflict receipts; preserve local data and the operation on mismatch.
- M4: Resolve whole records with explicit device/server choices, not automatic/per-field merging. Display answer/notes/status differences and version-labelled server context before making the decision concrete.
- M4: Add an account-scoped recovery history in Dexie v2. Archive local/server copies and the stopped operation in the same transaction as the decision. Retain copies across retries, reloads and sign-out; expose export without automatic pruning or restoration.
- M4: Reuse M3 RPC version checks and generate a fresh operation UUID for each reviewed local submission. Local revision and reviewed-version guards prevent stale-tab decisions. Completed server records cannot be overwritten. No new cloud migration is necessary.

- M5: Keep the existing idempotent RPC/queue; recover uncertain server outcomes by replaying the same UUID rather than generating replacement writes. Surface acknowledgment-storage failure separately and isolate per-record persistence failures within each bounded pass.
- M5: Explicit Sync may bring scheduled retries forward but cannot steal live leases or restart conflicts. Compare exact lease deadlines on late failures; accept immutable valid receipts after lease expiry. Preserve refreshed conflict snapshots against late receipt replay.
- M5: Validate repeated lost responses, reload and competing tabs plus acknowledgment quota failure against disposable real Supabase. Keep production credentials/data out of failure injection; no new dependency or database migration.

- M6: Use the existing queue due-time index; native browser measurement showed idle scans loading 1,000 delayed payloads unnecessarily. Preserve lease/block/version guards and test candidate selection without a schema migration.
- M6: Lazy-load secondary local pages while precaching all chunks. This reduces initial code execution with a small increase in total offline cache; measured tradeoffs are documented rather than claiming a universal startup gain.
- M6: Add axe-core only as a dev/test dependency, retain all WCAG rules and correct contrast findings. Pair scans with keyboard/320px workflow checks; do not claim full accessibility conformance or physical-device validation.

- M7: Emit public build-info.json containing only the application Git SHA; verify it after Pages deployment so HTTP 200 from an older release cannot be mistaken for the new release. Metadata is not precached.
- M7: Keep browser release checks separate from connected failure tests. Chromium CDP eligibility diagnostics are explicitly distinct from OS installation; mobile WebKit emulation is distinct from physical iOS/Safari testing.
- M7: Preserve the configured abbasikhadija origin/deployment. The continuation request's sultanshahdev URL was clarified by the owner as a paste mistake; no repository or hosted setup was replaced.
