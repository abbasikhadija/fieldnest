# Decisions

- M0: Hash routing and fixed /fieldnest/ base meet repository-subpath hosting without a custom 404 script. URLs use /fieldnest/#/activity.
- M0: Tailwind v4 Vite integration plus shared CSS primitives keeps the visual system small and readable.
- M0: Prompt-based service-worker updates avoid reloading future unsaved forms without user action. Only static resources are precached.
- M0: Planned screens explicitly describe unavailable functionality. No fabricated inspection records, save indicators, sync success, or sign-in controls.
- M0: Dexie and Supabase implementation/dependencies are deferred to their milestones; the required stack is unchanged.
- M0: Created a project-local Git repository because the inherited repository root was the Windows user directory. No parent files were staged.
- Planned: record-level concurrency and manual resolution favor understandable recovery over automatic merging. Validate with real PostgreSQL transactions before claiming correctness.
