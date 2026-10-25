# Architecture

## Application and hosting
React with strict TypeScript, Vite, Tailwind CSS v4 and React Router. App owns the responsive layout and routes; pages own task workflows; components contain shared icons, storage recovery and system notices. No external fonts or image requests are required.

HashRouter keeps routes in URL fragments, so GitHub Pages requires no rewrite. Vite base, manifest start URL, id, scope, icons and navigation fallback target /fieldnest/. Workbox precaches static assets only, never API data. Updates require an explicit reload and are disabled while a draft is dirty or a write is pending. Offline availability begins after the app has been successfully cached.

## M1 domain and local persistence
src/domain/inspection.ts defines the fixed eight-question checklist, answer types, progress and validation. The checklist covers general condition, kitchen, bathroom and electrical/safety checks; property information is immutable assignment context. Observations are optional and limited to 5,000 characters. Every question requires Pass, Fail or Not applicable before completion. Fail remains a valid recorded finding, rather than blocking completion.

src/persistence/database.ts defines Dexie schema version 1 in fieldnest-demo-v1. This database is exclusively for fictional local demo records. Future authenticated caches must use a separate account-scoped database and must never adopt this database as an authenticated user's workspace. No remote client, account cache or synchronization queue exists in M1.

Tables:
- inspections: primary key id; indexed status and updatedAt. Stores immutable property context, answers, notes, lifecycle state, local revision and acknowledged timestamps.
- meta: primary key key. An initialized marker is written in the same transaction as demo assignments, so refresh/concurrent startup never reseeds or overwrites drafts.

Schema changes must add a Dexie version with an explicit migration and tests; never delete/recreate the database to handle an upgrade. On versionchange the old connection closes. A failed subsequent read presents a storage recovery screen rather than silently resetting records.

Each save transaction reads the current record, checks expected local revision, rejects completed/stale writes, then persists the full draft with incremented revision and timestamp. Completion validates the checklist and commits status, answers and completion timestamp atomically. Completed demo inspections are read-only; the user can still review and download them. No save-success UI appears until the transaction resolves.

## Autosave and recovery
src/persistence/draftSession.ts owns per-record in-memory editing sessions across route changes. Choice inputs save immediately. Notes use a 250 ms trailing debounce; changes arriving while a write is running are coalesced into the next write. Only one write runs per session. Explicit flush and completion bypass the debounce, and completion waits for all draft writes. Sessions retain newer input while prior generations are being acknowledged.

Navigation never disposes an unsaved session. Failed writes leave the latest buffer dirty, stop automatic retries and show Retry/Download recovery actions. A global notice links back to unsaved records from any page. beforeunload requests a browser warning while a session is dirty or saving; update reload is blocked during the same period. Browser crashes, force-close and mobile OS termination can discard unacknowledged memory; only completed device writes survive refresh/restart. The UI never claims otherwise.

Dexie live queries refresh clean views after other tabs save. A dirty tab keeps its buffer and expected revision; a stale write is rejected transactionally. The user can download their retained draft and explicitly discard it to load the newer device copy. There is no automatic overwrite or merge. These local safeguards are not a server conflict implementation.

## Storage controls and limits
Settings requests persistent storage on a user action, reports the browser's result and approximate origin usage, and exports acknowledged records as JSON. Failed drafts can be downloaded directly from the editor. Exports are readable copies; in-app import is not implemented. No clear/reset action silently removes work. Storage denial, quota errors and failed transactions remain visible. Browser deletion/eviction, private browsing and device loss are documented limitations. Browser warnings and persistence requests are best effort, not durability guarantees.

## Verification and CI
Vitest/Testing Library cover navigation and honest demo status. fake-indexeddb exercises transactional seed behavior, draft reopen, abort rollback, validation, completion and stale-write rejection; these tests do not establish PostgreSQL guarantees. DraftSession tests cover delayed acknowledgments, coalescing/debounce, failed writes/retries and failed completion.

Playwright exercises built desktop/mobile workflows: subpath assets, manifest/scope, offline reload, direct routes/keyboard skip link, draft recovery, immediate route navigation, offline editing and completion, injected IndexedDB failures and two-tab stale drafts with explicit recovery. FIELDNEST_BASE_URL runs the same suite against an HTTPS /fieldnest/ deployment without a local preview server. GitHub Actions runs all checks before deployment on main; PRs only verify.

## Next boundaries
M2 introduces Supabase authentication, PostgreSQL schema, migrations and RLS with actual database integration tests. M3 introduces the documented transactional sync protocol. Neither is implemented in M1.

## M2: authentication and authorized server reads

The /account route is lazy-loaded and uses Supabase JS password authentication. Configuration is optional; missing configuration leaves the offline demo fully functional and explains the administrator setup requirement. Vite validates the URL and key before bundling, rejecting incomplete/unsafe configuration and privileged keys. The client persists its auth session in a project-scoped key and uses getUser for online identity verification.

src/auth/accountStore.ts invalidates private identity synchronously on Auth changes and schedules verification outside the Auth callback lock. Epoch checks ignore stale verification responses. The Account data view is keyed by verified user ID, aborts old requests and disappears before sign-out awaits a network operation. Failed sign-out does not reopen prior account data. Connected records are kept only in memory, not cached persistently. No connected writes/unsynchronized drafts exist in M2. Demo storage and editing sessions remain untouched on sign-out.

src/remote/ holds typed schema contracts, runtime response validation, project configuration and paginated authorized read functions. The M2 workspace retrieves at most 25 assignments per page and reads individual records on demand. Connected inspection views are read-only and require online verification; cached/offline connected work belongs to the synchronization milestone. Workbox continues caching only static build resources.

supabase/migrations/20261025000100_inspection_foundation.sql creates inspections, per-user assignments and shared inspection_records with version/answer/completion constraints. RLS grants only assignee reads and self-assignment visibility; anonymous reads and all browser writes are denied. A private, fixed-search-path security-definer helper avoids recursive assignment policies. Administration is via trusted Supabase tools, not frontend credentials. Indexes support assignee lookup and due-date pagination. Auth users belong to Supabase; no passwords are stored in application tables.

The native PostgreSQL runner tests real SQL/RLS/transaction behavior with a minimal auth context interface. A separate local Supabase suite verifies real Auth sign-in/sign-out and PostgREST authorization. CI runs both before deployment. Native tests do not pretend to verify Auth token issuance. docs/BACKEND_SETUP.md contains local Docker setup, private development users, SQL verification and exact hosted setup steps. Hosted credentials remain external configuration. No M3 mutation queue or synchronization RPC is implemented.

## M3: durable connected synchronization
Account/project-scoped Dexie databases are separate from the demo database. Downloaded assignments and their server records are stored transactionally. Connected editing reuses the acknowledged, serialized DraftSession autosave path with namespaced session identifiers. Failed memory buffers survive route changes, trigger unload/update safeguards, and are hidden behind account sign-in; downloads and explicit stale-tab recovery preserve the user's choice. Sign-out never deletes saved or pending work. Offline access uses only the locally retained Auth session, not a new sign-in or a claim of live authorization. Every upload verifies Auth and the RPC checks assignment again.

src/sync/database.ts owns atomic record/outbox writes, local revision checks, immutable operation snapshots, leases, durable retry state and acknowledgment transactions. Edits made while an earlier snapshot is pending remain in the record; after its acceptance the transaction queues the latest revision against the accepted version. Receipt processing cannot erase newer local work. Conflict and permanent-error states preserve data and stop automatic retry. Explicit Sync retries blocked errors after administrative recovery; conflicts remain stopped for M4.

src/sync/worker.ts processes at most ten operations per run, with 45-second transactional leases, a 20-second request deadline, exponential retry delays and jitter. The account workspace triggers it at startup, online, visibility, explicit Sync and a one-second active timer. A received acknowledgment may finish writing after account UI unmounts, but cannot reopen its UI. An interrupted worker leaves recoverable operations; no browser-closed sync is promised. Multiple tabs share claims; server idempotency remains the correctness boundary.

The M3 migration adds a security-definer RPC with fixed search path and a private receipt table. Direct browser table writes stay denied. Same-account operation IDs serialize through transaction advisory locks, record row locks serialize competing writers, and stored request equality prevents identifier reuse. Receipt and versioned record changes commit atomically. Receipts persist indefinitely unless their Auth account is administratively deleted; no unsafe time-based expiry is introduced. Conflict responses retain the server snapshot and never overwrite the local copy. M4 comparison/resolution is not implemented.

ConnectedWorkspace downloads 25 assignments per page, with explicit pagination/refresh. Downloads never replace pending, blocked or conflicting content or regress an acknowledged server version. The editor distinguishes unsaved, saving, device-saved/pending, synchronizing, acknowledged, blocked and conflict states. Completed answers are read-only. Recovery exports contain local content and any conflict snapshot, without login tokens. Browser deletion, eviction and device-loss limitations still apply.

M3 follow-up: src/remote/accountRequest.ts binds every protected request to the exact JWT verified for that account instead of allowing a shared client to select a later session at fetch time. Local acknowledgment transactions compare accepted receipts with the immutable stored operation, reject backward versions and preserve queued work on mismatch. Cleanup/newer-edit detection uses the durable operation revision. Regression tests use the actual Supabase JS request builder with a controlled fetch boundary to exercise session changes; backend correctness remains verified separately by real PostgreSQL/Supabase suites.

## M4: reviewed conflict resolution
The conflict screen compares raw checklist answers, observations and completion state while clearly marking differences; empty notes are distinguished from literal text. It labels the reviewed server version and retrieves a newer authorized copy on opening or explicit refresh. Offline review uses a clearly labelled last-known snapshot; version checks still apply to every upload. No automatic merge or unconditional overwrite exists.

ConnectedDatabase schema v2 adds an indexed resolutions table without resetting v1 data. A review decision atomically checks local revision/state and reviewed server version, archives both copies plus the stopped operation, removes the old operation, increments local revision and either adopts the reviewed server copy or creates a fresh immutable operation against that version. RecoveryHistory exposes those device-only snapshots for JSON download even after a successful decision or later conflict. No automatic cleanup, import or destructive undo is introduced.

A newer server edit during review causes the existing M3 RPC to return another conflict. Its fresh snapshot must be reviewed again; prior decisions remain archived. Concurrent local-tab decisions cannot both commit. Failed local archive/outbox writes roll back the entire choice. Completed server records remain immutable; the interface permits only download/adoption. Unsaved memory edits are not silently used or discarded: download or explicitly discard them to review the saved device copy. The server API, authorization checks, immutable receipts and versioning remain unchanged; M4 needs no new hosted SQL migration or credentials.
