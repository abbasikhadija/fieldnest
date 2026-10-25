# Fieldnest specification

Your work. Saved wherever you are.

Fieldnest serves property inspectors performing predefined property condition inspections. The complete product will support assigned inspections, incomplete drafts, automatic local saves, completion, safe Supabase synchronization and manual conflict resolution. The public demo will use isolated fictional local records; connected mode will use Supabase Auth, PostgreSQL and RLS.

The essential guarantee concerns successfully saved local changes only. Browser data deletion, eviction and device loss remain limitations. UI must distinguish unsaved, device-saved, pending, syncing, acknowledged, failed and conflicting work. Server acknowledgment must be persisted before queue cleanup. Stable operation identifiers, transactional idempotency and version checks are required.

M0 acceptance: responsive navigable shell; strict checks, lint and tests; production build loading beneath /fieldnest/; scoped PWA manifest and cached screens; CI/Pages workflow; initialized documentation and Git. Actual deployment is required when authorized access is available and must be verified. Forms and demo records are explicitly outside M0.

Later acceptance follows MASTER_PROMPT.md M1–M7, including refresh recovery, real database authorization tests, lost-acknowledgment retry tests and two-device conflict tests. No AI, analytics dashboard, form builder, photo uploads, CRDTs, microservices or speculative infrastructure. Do not imply a static shell satisfies the finished product's demo requirement.

## M1 acceptance
Visitors explicitly start a fictional local demo, browse property assignments, fill the predefined checklist, save incomplete drafts, review missing answers and complete an inspection. Acknowledged drafts and completed records must survive refresh and reopening storage. Offline use is supported after the application is cached. UI identifies local-only records and never invents server synchronization. Storage failures preserve unsaved memory with recovery actions; stale tabs cannot silently replace saved data. The next milestone remains M2; no backend functionality is part of M1.

## M2 acceptance and boundary
Supabase Auth verifies connected accounts online. Assignees can retrieve their inspections and shared server records; unassigned/anonymous users cannot access them. SQL constraints validate records, and direct client mutations (including self-assignment) are denied. Local setup supplies two private users sharing a property for future concurrency scenarios. Real PostgreSQL and actual Supabase Auth/PostgREST tests verify the foundation. Connected editing/offline caching and synchronization remain outside M2. Production account access requires the external hosted setup described in docs/BACKEND_SETUP.md.
