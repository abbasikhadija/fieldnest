# Fieldnest

**Your work. Saved wherever you are.**

A calm, offline-first property inspection app. Currently at M0: a responsive foundation preview with navigable screens and cached static resources. Inspection editing and durable local drafts arrive in M1. No records are saved or synchronized yet.

## Develop

Use Node.js 22.12 or newer in the Node 22 release line. Install with `npm ci`, then `npm run dev` and open http://127.0.0.1:5173/fieldnest/.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Browser tests: `npx playwright install chromium`, then `npm run test:e2e`. These run the built app on desktop and mobile and verify offline screen reload. `npm run preview` serves the production build.

No environment values are required for M0. `.env.example` reserves browser-safe Supabase configuration for M2. Never use secret/service-role credentials in Vite variables.

## Live application and deployment

Open [Fieldnest](https://abbasikhadija.github.io/fieldnest/). M0 is deployed and verified; this is a foundation preview, with inspection editing and local drafts planned for M1.

The [public repository](https://github.com/abbasikhadija/fieldnest) is configured with GitHub Actions as its Pages source. Pushes to main run dependency installation, type checking, lint, unit tests, production build and Chromium tests before deploying. Pull requests run verification only. Do not recreate the repository or change Pages to branch-based deployment.

[Deployment run 40171118430](https://github.com/abbasikhadija/fieldnest/actions/runs/40171118430) succeeded. The deployed origin returned HTTP 200 and passed all four desktop/mobile browser checks, including offline reload, asset paths, service-worker scope and keyboard navigation. Real-device installation prompts have not been verified.

Run the same suite against the live site from PowerShell:

```powershell
$env:FIELDNEST_BASE_URL = 'https://abbasikhadija.github.io/fieldnest/'
npm run test:e2e
Remove-Item Env:FIELDNEST_BASE_URL
```

This mode does not start a local preview server. Hash routes require no server rewrites. All static assets, manifest and service-worker scope target `/fieldnest/`.

## Engineering notes

See MASTER_PROMPT.md for scope and milestones, context.md for verified progress, and docs/ for architecture, decisions and synchronization design intent. Future drafts use IndexedDB/Dexie; connected mode uses Supabase/PostgreSQL/RLS. Browser storage can be evicted or cleared and cannot protect against device loss. Full demo and connected workflows are not implemented in M0.
