# Project context

Updated 2026-10-25 (Asia/Karachi).

## Milestone
M0 implementation and local verification complete. Public repository creation, push and live Pages deployment remain pending external GitHub setup. No M1 work started. Do not describe live deployment as complete.

## Implemented
- React/TypeScript/Vite, Tailwind v4, responsive brand and application shell.
- My work, Activity, Settings, planned inspection details, introduction and route fallback. Honest foundation-preview states only.
- Hash routes, fixed /fieldnest/ Vite base, scoped manifest with PNG icons, Workbox static precaching, offline notice and explicit update reload.
- GitHub Actions verify/deploy pipeline; strict TypeScript, ESLint, Vitest/Testing Library and Playwright infrastructure.
- Required documentation, environment example and ignore rules.

Key paths: src/App.tsx, src/pages/, src/components/, src/styles.css, vite.config.ts, e2e/foundation.spec.ts, .github/workflows/deploy.yml. Architecture and planned sync semantics are in docs/.

## Decisions
Hash routes avoid GitHub Pages server rewrite requirements. Only static assets are cached. No record persistence, fake sync, real assignments, authentication or Supabase client exists yet. Dexie arrives in M1 and Supabase in M2. Prompt-based PWA updates protect future in-progress forms. A project-local repository isolates this folder from an inherited Windows-user-directory Git repository. Test runner upgraded to Vitest 5.0.5 after npm audit findings; Node 22.12+ is required.

## Verification executed
- npm install: successful; final dependency update audited 535 packages, zero vulnerabilities.
- npm run typecheck: passed.
- npm run lint: passed.
- npm test: passed, 2 unit tests.
- npm run build: passed; service worker generated with 11 precache entries (~297 KiB), main JS ~87 KiB gzip.
- npx playwright install chromium: successful.
- npm run test:e2e: passed, 2 production tests (desktop Chromium and mobile emulation). Verified /fieldnest/ startup, hash navigation, manifest start URL/scope, both icon responses, registered service-worker scope, cached offline reload, offline notice, settings navigation and horizontal overflow.
- npm run dev: starts successfully at http://127.0.0.1:5173/fieldnest/.
- Desktop/mobile screenshots visually reviewed. Screenshots and browser output are ignored local verification artifacts.

An early check ran before installation finished and could not find tsc; all listed final checks were rerun after installation. No database/sync tests apply in M0. No real mobile device, installation prompt, deployed-origin PWA or live GitHub Actions run has been verified.

## Git and deployment
Project repository initialized on main. The implementation is committed as `chore: initialize Fieldnest M0 foundation`; inspect git log for the exact hash. No origin is configured; no push occurred. GitHub CLI is not installed, so authentication/repository permissions could not be checked. No public repository or live site was created. README.md contains exact gh commands to create the public fieldnest repository without overwriting an existing one, enable Actions-based Pages and dispatch the workflow.

## Remaining setup and next steps
Install/authenticate GitHub CLI, run README setup commands, wait for successful Actions deployment, verify the actual public /fieldnest/ URL and offline behavior on its origin, then record the evidence here. M0 deployment acceptance remains pending until that succeeds.

Next development milestone: M1 — Usable Inspection Interface and Local Persistence. Begin only when explicitly requested. Read the master prompt and all project context first; implement fictional demo data, predefined checklist, versioned Dexie persistence, reliable save acknowledgment, refresh recovery, validation and relevant failure tests. Do not build synchronization in M1.
