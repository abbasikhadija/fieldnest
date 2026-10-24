# Fieldnest agent instructions

Read MASTER_PROMPT.md completely, then PROJECT_SPEC.md, context.md, docs/ARCHITECTURE.md, docs/DECISIONS.md and docs/SYNC_PROTOCOL.md before changes. The master prompt is authoritative. Preserve existing work.

Build one explicitly requested milestone at a time. M0 ends at the foundation; do not add inspection editing, persistence or synchronization without a new instruction. Keep UI calm, mobile-first, accessible and honest about storage/server status. Use strict TypeScript, small React components, and clear domain/persistence/remote boundaries as they become necessary. Never expose secret or service-role credentials.

Commands: npm ci; npm run dev; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e (install Chromium using npx playwright install chromium first).

Before completion run relevant checks, verify /fieldnest/ production assets, update context.md with actual results and outstanding work, and commit intentionally. Do not claim unexecuted checks or unverified deployment. Never overwrite a remote or force-push. Future record changes must use Dexie transactions, account-scoped data and acknowledged local writes. Design synchronization before implementing it.
