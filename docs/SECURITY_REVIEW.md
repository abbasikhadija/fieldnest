# M7 security review — 2026-10-26

Scope: application code, SQL authorization/mutation boundaries, browser build, dependency audit and deployment configuration. This is an engineering review, not a penetration-test certification.

| Boundary | Protection and evidence |
| --- | --- |
| Credentials | Build-time config accepts browser-safe keys and rejects privileged keys; existing unit tests cover rejection. Browser source/build pattern checks look for secret-key/private-key material and service-role JWTs without printing values |
| Authorization | RLS permits assignee reads/self-only assignments; anonymous reads/direct browser writes are revoked. Real PostgreSQL and Supabase tests verify access and revocation |
| Mutations | Authenticated RPC checks assignment on every call, including replay; validates payload/version; fixes search_path; commits record and receipt atomically |
| Session races | Requests bind to the exact verified account JWT. Auth changes hide private views. Sign-out retains saved work without exposing another account |
| Device storage | Demo and account/project databases are separate. No destructive automatic cleanup. Storage is not encrypted/protected against someone controlling the device/origin |
| Rendering | React renders inspection values as text. Recovery exports contain snapshots, not session tokens. No arbitrary HTML renderer or secret-backed frontend API |
| Offline | Only static application assets are precached, not private API responses. Browser-closed synchronization is not promised |
| Deployment | Least-privilege workflow permissions, independent verification gates, public build revision metadata and exact-revision post-deploy smoke verification |

The pattern check is not a comprehensive secret/history audit or proof of RLS correctness. Deliberately invalid test keys and loopback-only administrative fixtures stay separate from browser output. Environment files, local account fixtures and generated build output are ignored by Git. Audit and test results are recorded in context.md/RELEASE.md. Zero npm audit findings do not imply complete security; existing dependency deprecation notices remain maintenance work rather than a reason for blind release-time upgrades.

## Limits and operational rules

- Keep public signup disabled and provision private accounts. Never publish passwords or privileged cloud keys.
- Browser storage is not encryption. Sign out successfully on shared devices; a compromised device/origin is outside local isolation guarantees.
- No custom enforced CSP/header policy is configured on GitHub Pages. React escaping and dependency hygiene do not eliminate XSS/supply-chain risk; hosting/header changes need separate review.
- Eviction/deletion/device loss can remove work/history. JSON exports have no in-app import.
- Receipts/recovery copies are not automatically pruned. A future retention policy must preserve retry safety.
- Reconcile manually applied hosted migration history before CLI upgrades; never replay foundation/seed or reset hosted data.
- Physical-device, installed-PWA, assistive-technology and privately authenticated hosted second-device results remain separate from disposable automated tests.

Read-only hosted checks on 2026-10-26 independently confirmed Email enabled, public signup disabled and anonymous inspection-record GET denied with HTTP 401. Only the browser-safe publishable configuration was used; no private account was signed in and no production record was modified. npm ci/full install audit and npm audit --omit=dev both reported zero vulnerabilities. The limited browser scan passed on the current build; fresh CI results follow in RELEASE.md/context.md.
