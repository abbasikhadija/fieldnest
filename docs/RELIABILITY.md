# Failure recovery checks (M5)

Fieldnest retains saved work until server acknowledgment is processed in a device transaction. A missing response means the server result is uncertain, not that the server rejected the work. Retrying the same saved request confirms its original result without applying it twice.

## Recovering work

- **Offline:** keep working on downloaded inspections. Wait for the device-save indicator. Connect and keep Fieldnest open to resume synchronization.
- **Retry scheduled:** automatic retries use increasing delays. **Sync saved work** brings eligible retries forward. It leaves active attempts in other tabs alone.
- **Server response could not be saved:** the original request remains available for replay. Check device space, download the device copy, and retry. A server success is not displayed until device acknowledgment processing finishes.
- **Unable to sync:** open the inspection for its error. Resolve account/access/server setup problems, then choose **Sync saved work**. Signing out retains saved work for that account.
- **Needs review:** compare the device and server copies. Ordinary retry does not restart a conflict. Both reviewed copies remain in device recovery history after resolution.

Keep unsaved edits open when storage fails and use the download action. Browser data deletion, storage eviction and device loss can remove local work and history; exported JSON has no in-app import. Synchronization while the browser is closed is not promised.

## Reproduce automated checks

```powershell
npm ci
npm run typecheck
npm run lint
npm test -- --maxWorkers=1
npm run test:db
npm run build
npm run test:e2e
```

The one-worker unit command reduces process load on Windows. CI also runs the normal unit command. Native SQL tests create an isolated PostgreSQL cluster; see BACKEND_SETUP.md for prerequisites.

For a **disposable local Supabase stack**, with Docker available:

```powershell
npx supabase start
npm run test:auth
npm run seed:local
npm run build:local
npx playwright install chromium
npm run test:e2e:auth
```

The connected suite creates/deletes its own fictional assignments using a loopback-only fixture. Local credentials stay in ignored `.local` files. Do not target hosted accounts/data or run test bootstrap SQL against production.

| Scenario | Evidence |
| --- | --- |
| Repeated responses lost after real server commit, offline reload, two tabs resume | e2e-connected/reliability.spec.ts; each retry retains one UUID and server version 2 |
| Real server accepts but IndexedDB acknowledgment save fails | Same browser suite; success remains unconfirmed until safe replay |
| Timeout, aborted transport, late response | src/sync/reliability.test.tsx; saved operation remains retryable |
| Per-record acknowledgment and failure-metadata writes fail | Same unit suite; unrelated record succeeds, original request survives |
| Expired claims, stale failures, duplicate acknowledgments | Same unit suite; independent connections cannot clear a newer claim or apply twice |
| Backoff, restart, pending newer edits, blocked record isolation | src/sync/synchronization.test.tsx |
| Conflict resolution failures and concurrent decisions | src/sync/conflictResolution.test.tsx; real PostgreSQL synchronization tests; connected conflict suite |
| Actual authorization, transactional rollback and idempotent receipt replay | tests/database/ and scripts/test-supabase.mjs |

Unit storage tests use fake-indexeddb; they do not alone prove browser or server correctness. Connected tests use actual Chromium and Supabase. Physical mobile devices, Safari and Firefox remain unverified. The owner explicitly skipped manual hosted offline/second-device checks; automated disposable-backend results are documented separately in context.md.
