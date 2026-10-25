# Supabase setup (M2 foundation and M3 upgrade)

M2 provides real password authentication, authorized assignment/record reads, SQL constraints and RLS. Connected records are read-only and online-only in this milestone. M3 implements durable synchronization; existing hosted projects must apply the new migration using the M3 upgrade section below. The existing local demo needs no backend and remains isolated.

## Local Supabase with Docker

Install/start a Docker-compatible runtime first, then run in the project folder:

```powershell
npm ci
npx supabase start
npm run seed:local
npm run test:auth
```

The CLI applies supabase/migrations/ and supabase/seed.sql to its local database. `seed:local` uses the local Auth Admin API to create two private test users sharing Willow Court. Random passwords are saved in ignored `.local/accounts.json`; they are never committed or printed. Keep that file when rerunning the seed. It is a local development fixture, not a public demo login. The script refuses hosted service URLs and never accepts hosted administrator credentials.

Inspect `npx supabase status` on your own machine to find the local URL and anon/publishable key. Put only the URL and browser-safe key into an ignored `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local anon or publishable key>
```

Never copy the service-role/secret key into a VITE_ variable. Then run `npm run dev`, open http://127.0.0.1:5173/fieldnest/#/account, and use credentials from `.local/accounts.json`. Both inspectors should see Willow Court and its shared server draft. Other properties are inaccessible without an assignment.

`npx supabase stop` stops the local stack without deleting its data. To verify migration reproducibility on a **disposable local stack only**, `npx supabase db reset --local` erases that local stack and replays migrations/seeds. Never use a reset against a hosted project containing work. After a disposable reset, rerun seed:local to recreate the development users.

## Database tests without Docker

`npm run test:db` creates an isolated temporary PostgreSQL cluster, applies the real migration/seed, runs RLS and constraint tests, stops the server and removes only that temporary directory. Windows defaults to C:/Program Files/PostgreSQL/18/bin. Set PG_BIN to another installed PostgreSQL bin directory if needed. On Linux, PG_BIN can point to /usr/lib/postgresql/17/bin; run initdb as a non-root user.

The harness supplies only the minimal auth.users/auth.uid()/role interface needed for native PostgreSQL tests. It is not a Supabase Auth emulator and is never a production migration. Real Auth token verification and PostgREST integration are tested separately by `npm run test:auth` against the actual disposable Supabase stack. CI runs both suites.

CI's native SQL job uses a fresh loopback database named fieldnest_test. FIELDNEST_TEST_DATABASE_URL is accepted only for that database name on localhost/127.0.0.1. The runner refuses hosted/non-test targets and does not reset existing databases. Use a fresh test service, not a shared development/production database.

## Hosted project and GitHub Pages

No hosted Supabase project is configured in this repository yet. Complete these steps to enable connected accounts on the live app:

1. Create a project at https://supabase.com/dashboard. Keep its database password private. Record its project reference from the dashboard URL.
2. Apply the checked-in migration (no production reset):

```powershell
npx supabase login
npx supabase link --project-ref <your-project-reference>
npx supabase db push --linked
```

3. In **Authentication → Providers**, enable Email/password. Disable public signup in the project's Auth settings. Set the Site URL to https://abbasikhadija.github.io/fieldnest/. This app uses password sign-in, not OAuth/magic-link/password-reset redirects.
4. Under **Authentication → Users**, create two private users you control (use Create user, with confirmed email as appropriate). Do not publish their passwords. Copy their user UUIDs. Do not create a publicly shared privileged demo account.
5. For a fresh development project, execute supabase/seed.sql in the dashboard SQL editor to add fictional server properties. Then assign the shared property to your two users, replacing both UUID placeholders:

```sql
insert into public.inspection_assignments(inspection_id, user_id) values
('10000000-0000-4000-8000-000000000001', '<first-auth-user-uuid>'),
('10000000-0000-4000-8000-000000000001', '<second-auth-user-uuid>');
```

For real records, an authorized administrator creates inspections and initial inspection_records, then assigns existing auth.users. Browser clients cannot create assignments or directly write records in M2. Do not rerun the seed against an already populated project or overwrite existing data.

6. In the Supabase project API settings, copy its HTTPS project URL and **publishable key** (or legacy anon key). Never use a secret/service-role key.
7. Open https://github.com/abbasikhadija/fieldnest/settings/variables/actions and add repository variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. These are public frontend configuration, not privileged credentials. The build refuses privileged keys before bundling. Leave both variables empty for demo-only deployment.
8. In GitHub **Actions → Verify and deploy Fieldnest**, choose **Run workflow → main**. Variables take effect on the next build, not instantly.
9. Once deployment succeeds, open https://abbasikhadija.github.io/fieldnest/#/account. Sign in privately as each authorized user and verify Willow Court appears. A third unassigned user must see no assignments. Sign out and confirm private records disappear while local demo drafts remain. Check the actual cloud project before declaring hosted integration verified.

No hosted connection or account access is claimed until these steps are performed and tested. Never send privileged keys or passwords through chat or commit them to Git.

## Scope and authorization

The public schema contains inspections, inspection_assignments and inspection_records. RLS permits authenticated assignees to read their inspections and the shared record, and permits reading only their own assignment rows. Anonymous clients have no table privileges. All client inserts, updates and deletes are revoked. Private authorization helpers have fixed search paths; the private schema is not exposed through PostgREST. Record constraints validate answer keys/values, observations, versions and completion.

Connected inspection data is held only in memory in M2, not in IndexedDB, localStorage or the service-worker cache. Auth sessions persist in the Supabase client's project-scoped browser storage. Auth changes hide records synchronously, reverify through getUser outside the Auth callback lock, cancel old requests and remount data per verified user ID. Sign-out hides records before attempting session removal. If sign-out fails, records stay hidden and a retry is offered; do not leave a shared browser until sign-out succeeds. Demo drafts are not deleted. No connected pending drafts exist in M2, so no unsynchronized data is removed on logout.

Offline connected authentication/access is unavailable in M2. Signing in and retrieving records require a live verified account; disconnected views are hidden. The local demo keeps its offline workflow. Browser-based storage is not protection against a compromised/shared device, and logging out locally does not claim to revoke every previously issued JWT on every device.

## References

- https://supabase.com/docs/guides/local-development/cli-workflows
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange

For actual connected browser tests against the disposable local stack:

```powershell
npm run seed:local
npm run build:local
npx playwright install chromium
npm run test:e2e:auth
```

build:local reads only the local URL and anon key into the frontend build. The connected browser suite signs in privately as both development users, reads their shared server record, checks that local demo answers are separate, signs out across two tabs and confirms demo drafts survive. It does not accept hosted administrator keys or publish fixture passwords.

## M2 verification evidence
GitHub Actions run https://github.com/abbasikhadija/fieldnest/actions/runs/40174570852 passed all gates and deployed the frontend. It actually ran 12 Supabase Auth/PostgREST tests plus 2 connected-browser tests against its disposable stack. The public site also passed 12 default desktop/mobile regression tests. This does not configure or verify a hosted Supabase project; complete the hosted steps above before claiming production account access. In local config, auth.enable_signup=false blocks public registration while auth.email.enable_signup=true keeps existing-user email sign-in enabled; this combination is intentional and covered by the real Auth suite.

## Current hosted project setup
Project lxoknylvpjvqaqsdindf is now connected to the Pages frontend using GitHub Actions variables. The user applied the initial migration and fictional seed manually in SQL Editor and reported success. The first private user was assigned Willow Court. Deployment run 40178545469 succeeded, all 12 public-site regression tests passed, and the configured sign-in form was independently verified. Authorized hosted sign-in and record access still require the user's private test; no passwords should be sent through chat.

At the last check, Email sign-in was enabled but public signup was still enabled. Disable Allow new users to sign up under Authentication > Sign In / Providers, without disabling the Email provider, and save if shown. Then privately verify the assigned account sees Willow Court, an unassigned account sees no records, and sign-out hides server records.

Because the initial hosted migration was applied manually, do not rerun its CREATE statements with db push. Before a future CLI migration, link to the project and inspect migration history:

```powershell
npx supabase login
npx supabase link --project-ref lxoknylvpjvqaqsdindf
npx supabase migration list --linked
```

Only after verifying that the hosted baseline matches the checked-in initial SQL, if version 20261025000100 is absent from the remote history, record it without reapplying schema:

```powershell
npx supabase migration repair 20261025000100 --status applied --linked
```

Do not run repair if history already contains that version or if the schema does not match. Investigate drift first. No repair/reset has been performed during this setup, and no privileged database password was provided to the agent.

## Hosted setup accepted — 2026-10-25
The account owner confirmed private sign-in, assigned Willow Court visibility, checklist access and successful sign-out on the deployed site. The hosted Auth settings endpoint independently confirmed Email enabled and public signup disabled. Hosted M2 setup is complete. Hosted second-user/unassigned-user scenarios were not separately exercised; those authorization scenarios passed against real disposable Supabase CI. Never treat historical pending-setup notes as instructions to recreate/reset this configured project.

## M3 hosted upgrade (required before hosted synchronization)
The existing hosted M2 project and its data must be preserved. The M3 frontend and disposable tests do not apply cloud migrations. No hosted M3 success is implied by a frontend deployment.

Preferred dashboard path, requiring only the project owner's private dashboard access:
1. Open project lxoknylvpjvqaqsdindf in Supabase Dashboard > SQL Editor.
2. Check whether the RPC already exists: `select to_regprocedure('public.apply_inspection_operation(uuid,uuid,integer,jsonb)');`. If it exists, inspect the deployed definition/history before changing anything; do not blindly replay CREATE statements.
3. If absent, run **only** `supabase/migrations/20261025000200_durable_sync.sql` in a transaction (`begin;` before its contents, `commit;` after). Do not replay the M2 foundation, seed, or reset data. This creates the private receipt table and authenticated RPC; existing records, assignments and direct-write restrictions remain intact.
4. Privately sign in to the Pages connected workspace, refresh downloaded assignments, open an assigned draft, disconnect, answer/complete, and wait for the device-save indicator. Reload offline and reopen the record. Reconnect and choose Sync saved work; if setup was previously blocked, this explicitly retries the retained operation. Wait for Synchronized with server, then sign in on another authorized device to verify the same answers. Do not use production work for destructive tests. Keep private account credentials out of chat/Git.

For CLI deployment, first follow the existing baseline schema/history verification and repair instructions above. After confirming the baseline exactly matches, apply `npx supabase db push --linked`. If you used SQL Editor for M3 too, verify its schema and mark version 20261025000200 applied only if CLI history lacks it; never execute it a second time blindly. No hosted link, history repair or migration was performed by the agent during M3 development.

Local verification: start disposable Docker Supabase, apply migrations via `npx supabase db reset --local` **only on that disposable stack**, then `npm run test:auth`, `npm run seed:local`, `npm run build:local`, `npm run test:e2e:auth`. The browser suite creates and deletes unique fictional properties through a loopback-only fixture script. Local account fixture files and privileged local keys must stay ignored.

## M4 hosted use
M4 needs no additional cloud SQL beyond the M3 migration. It reuses the existing version-checked RPC and adds the review/recovery interface plus a non-destructive Dexie v2 upgrade. Do not rerun M2/M3 SQL or reset the project for M4.

The owner reported successful manual M3 SQL installation and online synchronization/refresh recovery. The screenshot showed a completed, synchronized server inspection at version 10. The owner then verified offline refresh recovery in local demo mode. Those are distinct checks: the owner explicitly chose to skip further manual connected offline-to-server testing and authorized M4. Hosted offline/second-device manual verification remains unperformed; CI's real Supabase tests cover those workflows. The owner also created a fictional connected draft (14 Birch Walk) for optional later testing. No M4 code modifies that hosted data or creates conflicts in the production account.

When a real conflict appears, open the inspection, review highlighted values and choose Use server copy or Apply my device copy. Both reviewed copies stay in Previous review copies on that device. Applying the device copy is only queued locally until the existing sync worker receives and durably records server acceptance. If another writer wins first, review the new conflict again. Completed server inspections cannot accept replacement answers.
