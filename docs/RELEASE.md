# M7 release verification

Live app: https://abbasikhadija.github.io/fieldnest/

M7 preserves M0–M6 and adds release/installability checks, production smoke automation, security review, portfolio documentation and authentic fictional-data screenshots. No new synchronization engine or hosted schema migration.

## Automated gates

- Fresh install, TypeScript, ESLint, unit tests and real PostgreSQL tests.
- /fieldnest/ production build and limited browser privileged-credential pattern check.
- Existing desktop/mobile functional/accessibility regressions.
- Actual disposable Supabase Auth/API and connected sync/conflict/failure tests.
- Chromium, Firefox and iPhone-emulated WebKit offline save/reload release tests.
- Chromium CDP manifest/installability diagnostics. The two non-Chromium copies of that diagnostic are intentionally skipped, not passing installation tests.
- Pages deployment followed by exact Git-revision, HTML/assets, manifest/scope, 192/512 icon dimensions and service-worker smoke checks.
- Browser/offline verification against the public HTTPS origin.

```powershell
npm run build
npm run security:check
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:release
npm run smoke:production
```

Set FIELDNEST_BASE_URL to the live URL for deployed browser checks. Set FIELDNEST_EXPECTED_REVISION to the deployed application commit for an exact smoke comparison. Evidence-only [skip ci] documentation commits can follow without changing that application revision.

## Manual checks requiring a real device/account

| Check | Status |
| --- | --- |
| OS-level PWA installation and standalone launch | Unverified; eligibility diagnostics do not install an OS app |
| Physical Android/iOS touch and offline reopening | Unverified; emulation is separate evidence |
| Screen-reader user evaluation | Unverified; automated scans/keyboard tests are separate evidence |
| Private hosted offline-to-server/second-device use | Previously explicitly skipped by owner; disposable integration coverage remains required |

Follow DEMO_GUIDE.md on the actual device and record OS, browser/version, date and result here. Use fictional properties, never clear real site data and never share credentials. These limits remain visible after automated release gates pass.

## Evidence

Actual results, release commit and deployment status are appended after execution. Previous milestone success alone does not establish M7 verification.

Recovered local results (2026-10-26): fresh install/audits, typecheck, lint, 76 unit tests, 37 PostgreSQL tests, build, limited secret-pattern check and all 16 standard browser regressions passed. Chromium/mobile WebKit release checks passed (3 passing, 1 Chromium-only diagnostic skipped on WebKit). Firefox binary downloaded but Windows launch failed with spawn UNKNOWN; Linux CI execution remains required. Dedicated-preview smoke passed; a wrong expected revision was rejected. Production M7 deployment remains pending until the final push/check. The owner clarified the target as abbasikhadija, preserving origin.

### Final continuation snapshot — 2026-10-26

- Application/release commit: c6c6bd742048cb53b447cdb1865b9564db4e3a8b, pushed to origin/main.
- Existing live site: https://abbasikhadija.github.io/fieldnest/ (owner explicitly confirmed this target).
- Public-origin Chromium/mobile-WebKit release checks: 3 passed, 1 intentional CDP skip (26.9s). Offline drafts/observations survived reload; Chromium returned no manifest/installability errors.
- Single requested CI snapshot: [run 40362401477](https://github.com/abbasikhadija/fieldnest/actions/runs/40362401477) was **in progress**, no conclusion. No subsequent polling was performed.
- **Not yet verified:** final Linux Firefox/connected CI gates, new M7 deployment and exact-commit post-deploy smoke result. Existing live functionality is not evidence that the new metadata/workflow deployed.
- **Project completion status:** implementation/documentation complete; release acceptance pending those critical checks. Manual device/installation/accessibility limits above remain visible.

Open that run to confirm verify, verify-auth, deploy and smoke-production are successful. Then set FIELDNEST_EXPECTED_REVISION to c6c6bd742048cb53b447cdb1865b9564db4e3a8b and run `npm run smoke:production`. Documentation-only [skip ci] commits do not change the expected application revision. No new Supabase migration or credentials are required. Investigate a specific failing step before repeating tests.
