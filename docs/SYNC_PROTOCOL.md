# Synchronization protocol — design intent, not implemented

M0 contains no synchronization engine, queue, persistence or backend. This document establishes constraints for the detailed M3 design; it is not an implemented API contract.

Each queued operation will have a stable UUID, authorized record identifier, expected base version, validated payload and account scope. The operation identifier remains unchanged across retries, including timeouts and lost acknowledgments. Local record and queue edits must commit atomically through Dexie before announcing a save.

A PostgreSQL transactional function must authenticate and authorize every operation, validate its structure, deduplicate by authorized operation identity, check the expected version and atomically commit both the record and stored result. Retrying a committed operation returns its stored acknowledgment. Define identifier-reuse/payload mismatch rejection and retention before implementation.

Client acknowledgment processing must atomically persist accepted version/result and finalize its queue entry. A lost response leaves the entry retryable. Dependent operations preserve order per record; unrelated failures are isolated. Retry uses bounded exponential backoff with jitter. Active-app events trigger processing; browser-closed synchronization is not promised.

A version mismatch preserves local and remote snapshots. Manual resolution displays differences and creates a new operation against the reviewed server version. Repeated conflicts require review again, never unconditional overwrite. Account changes cannot expose another user's records or silently delete pending work. Multi-tab coordination is an optimization; server idempotency remains mandatory.

Before M3 finalize operation schema, RPC/error contract, dependency ordering, queue leasing, retention and security rules. Verify against real database transactions, including duplicate delivery, lost acknowledgment, interrupted local acknowledgment and two-device conflicts. No guarantees above have been tested in M0.

## M1 boundary
Local demo inspection saving is now implemented with Dexie; the protocol above remains design intent for future connected mode. The local revision is a device-only concurrency token, not a server version. No operation identifiers, mutation queue, remote processing, acknowledgments or synchronization workers exist yet. Demo records never display server acceptance or pending-sync indicators. Detailed local save/recovery semantics are documented in ARCHITECTURE.md.

## M2 boundary
Server inspection and assignment tables, constrained shared inspection_records and RLS now exist. The version column is reserved for the future version-checked protocol; M2 clients can only read. No processed-operation table, idempotency function, outbox, retry worker, record upload or conflict-resolution endpoint is implemented. Connected data is not stored in the demo database or automatically synchronized. M3 must define and test the complete mutation/acknowledgment contract before enabling any connected edits.
