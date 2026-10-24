# Fieldnest

**Your work. Saved wherever you are.**

A calm, offline-first property inspection app. Currently at M0: a responsive foundation preview with navigable screens and cached static resources. Inspection editing and durable local drafts arrive in M1. No records are saved or synchronized yet.

## Develop

Use Node.js 22. Install with `npm ci`, then `npm run dev` and open http://127.0.0.1:5173/fieldnest/.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Browser tests: `npx playwright install chromium`, then `npm run test:e2e`. These run the built app on desktop and mobile and verify offline screen reload. `npm run preview` serves the production build.

No environment values are required for M0. `.env.example` reserves browser-safe Supabase configuration for M2. Never use secret/service-role credentials in Vite variables.

## GitHub Pages setup

GitHub CLI was unavailable during initialization. After installing it, run the following in this directory (repository creation intentionally fails if that name already exists):

```powershell
gh auth login
gh repo create fieldnest --public --source=. --remote=origin --push
$owner = gh api user --jq .login
gh api --method POST "repos/$owner/fieldnest/pages" -f build_type=workflow
gh workflow run deploy.yml
gh run list --workflow deploy.yml
```

If Pages is already configured, inspect its settings rather than creating it again. The repository must use **Settings → Pages → Source → GitHub Actions**. Wait for the workflow to succeed, then verify `https://<github-username>.github.io/fieldnest/` and navigation/offline reload on that origin. No live deployment is claimed yet.

The workflow checks types, lint, unit tests, build and Chromium tests before deployment. Hash routes work without server rewrites. All static assets, manifest and service-worker scope target `/fieldnest/`.

## Engineering notes

See MASTER_PROMPT.md for scope and milestones, context.md for verified progress, and docs/ for architecture, decisions and synchronization design intent. Future drafts use IndexedDB/Dexie; connected mode uses Supabase/PostgreSQL/RLS. Browser storage can be evicted or cleared and cannot protect against device loss. Full demo and connected workflows are not implemented in M0.
