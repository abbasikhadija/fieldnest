# Synchronization protocol — design intent, not implemented

M0 contains no synchronization engine, queue, persistence or backend. This document establishes constraints for the detailed M3 design; it is not an implemented API contract.

Each queued operation will have a stable UUID, authorized record identifier, expected base version, validated payload and account scope. The operation identifier remains unchanged across retries, including timeouts and lost acknowledgments. Local record and queue edits must commit atomically through Dexie before announcing a save.

A PostgreSQL transactional function must authenticate and authorize every operation, validate its structure, deduplicate by authorized operation identity, check the expected version and atomically commit both the record and stored result. Retrying a committed operation returns its stored acknowledgment. Define identifier-reuse/payload mismatch rejection and retention before implementation.

Client acknowledgment processing must atomically persist accepted version/result and finalize its queue entry. A lost response leaves the entry retryable. Dependent operations preserve order per record; unrelated failures are isolated. Retry uses bounded exponential backoff with jitter. Active-app events trigger processing; browser-closed synchronization is not promised.

A version mismatch preserves local and remote snapshots. Manual resolution displays differences and creates a new operation against the reviewed server version. Repeated conflicts require review again, never unconditional overwrite. Account changes cannot expose another user's records or silently delete pending work. Multi-tab coordination is an optimization; server idempotency remains mandatory.

Before M3 finalize operation schema, RPC/error contract, dependency ordering, queue leasing, retention and security rules. Verify against real database transactions, including duplicate delivery, lost acknowledgment, interrupted local acknowledgment and two-device conflicts. No guarantees above have been tested in M0.
