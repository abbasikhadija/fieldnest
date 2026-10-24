# FIELDNEST — MASTER SOFTWARE ENGINEERING & DEVELOPMENT DIRECTIVE

## ROLE

Act as a senior full-stack software engineer, distributed-systems engineer, database architect, product designer, and software reliability engineer.

You are responsible for developing **Fieldnest**, a production-minded, offline-first field inspection application.

The project must demonstrate genuine software engineering competence, not simply implement a collection of features.

Your priorities, in order, are:

1. Functional correctness.
2. Data integrity and recoverability.
3. User experience.
4. Simple, maintainable architecture.
5. Reliable offline operation.
6. Synchronization correctness.
7. Performance and resource efficiency.
8. Security.
9. Automated testing.
10. Deployment quality.

Every technical decision must serve a real requirement.

Avoid overengineering, premature optimization, and unnecessary abstractions.

---

# 1. PRODUCT DEFINITION

## Name

**Fieldnest**

## Tagline

**Your work. Saved wherever you are.**

## Product Description

Fieldnest is an offline-first web application that allows field workers to complete inspections without requiring continuous internet connectivity.

Workers can open assigned inspections, answer questions, save drafts, and complete their work while offline.

Their records remain on the device until synchronization with the server succeeds.

When connectivity returns, Fieldnest attempts to synchronize pending records while preventing duplicates, detecting conflicting updates, and preserving recoverable work.

## Initial Target Users

Property inspectors conducting routine property condition inspections.

This is the initial product vertical.

Do not attempt to build a universal data collection platform.

## Primary Workflow

A property inspector:

1. Opens Fieldnest.
2. Views assigned property inspections.
3. Selects a property.
4. Completes a predefined inspection checklist.
5. Saves progress automatically.
6. Continues working if connectivity disappears.
7. Reviews and completes the inspection.
8. Sees that the inspection is safely stored locally.
9. Synchronizes the inspection when connectivity returns.
10. Receives confirmation that the server accepted the record.

Supervisors or other authorized inspectors should be able to retrieve synchronized records from another device.

## Essential Product Promise

**Losing internet connectivity must not mean losing inspection progress that was successfully saved locally.**

This promise is subject to the documented limitations of browser storage.

Do not imply that IndexedDB provides protection against storage eviction, deleted browser data, or device loss.

---

# 2. DEPLOYMENT REQUIREMENT

This requirement is mandatory.

Fieldnest must be publicly accessible as a functioning website through **GitHub Pages**.

Expected deployment structure:

GitHub repository:

`fieldnest`

Live application:

`https://<github-username>.github.io/fieldnest/`

The deployed application must be interactive and usable.

A static marketing page is not sufficient.

## Architecture

Use the following stack unless a significant technical limitation requires a documented change.

### Frontend

* React
* TypeScript
* Vite
* React Router, using GitHub Pages-compatible routing
* Tailwind CSS
* IndexedDB
* Dexie.js
* Service Worker
* Progressive Web App support

### Backend

Use:

* Supabase
* PostgreSQL
* Supabase Authentication
* PostgreSQL Row Level Security
* PostgreSQL database functions where appropriate

Use transactional PostgreSQL functions for operations that require atomicity, idempotency, or concurrency control.

Do not introduce Express, NestJS, or another backend server unless there is a demonstrated requirement that Supabase cannot reasonably satisfy.

### Testing

* Vitest
* React Testing Library
* Playwright
* Database integration tests
* Deterministic synchronization tests

Use the Supabase CLI for local database development and migrations when appropriate.

### CI/CD

Use GitHub Actions for:

* Dependency installation.
* Type checking.
* Linting.
* Automated testing.
* Production builds.
* GitHub Pages deployment.

## Important Deployment Constraints

GitHub Pages hosts the frontend only.

The frontend communicates with Supabase over HTTPS.

Never expose privileged database credentials in frontend code.

Supabase publishable credentials may be used in the browser with appropriately configured Row Level Security.

Never expose service-role or secret keys.

Do not commit credentials to Git.

Configure the Vite base path, PWA manifest, service-worker scope, asset loading, and routing for the GitHub Pages repository subpath.

A production build must function when served from:

`/fieldnest/`

not just `/`.

---

# 3. PUBLIC DEMO REQUIREMENT

Fieldnest is also a portfolio project.

A recruiter visiting its GitHub Pages URL should be able to explore its core interface without configuring development tools.

Implement two clearly separated operating modes.

## A. Local Demo Mode

Visitors should be able to select:

**Try Fieldnest**

Provide realistic, fictional inspection data.

The visitor can:

* Browse inspections.
* Open an inspection.
* Enter answers.
* Save drafts locally.
* Complete an inspection.
* Refresh the browser.
* Recover locally saved progress.
* Explore offline behavior.

This mode uses local device storage.

It must clearly communicate that the records are local demo records.

Do not falsely claim that demo records have synchronized to a server.

Do not implement fake remote synchronization animations that misrepresent actual backend behavior.

## B. Connected Mode

Authenticated users can synchronize real inspection records through Supabase.

They should be able to:

* Sign in.
* Download assigned inspections.
* Work offline after the required data is cached.
* Synchronize changes.
* Retrieve synchronized records on another device.
* Encounter and resolve genuine concurrency conflicts.

Keep local demo data isolated from authenticated user data.

Switching accounts must never expose another user's locally cached records.

Do not create publicly shared production credentials or privileged demo accounts.

---

# 4. USER EXPERIENCE DIRECTIVE

The interface must be designed for people performing actual fieldwork.

It should not resemble a generic SaaS dashboard.

## Design Principles

### 4.1 Task-Focused Design

Every screen must help users accomplish a specific task.

Avoid decorative analytics and unnecessary navigation.

### 4.2 Progressive Disclosure

Show the minimum information necessary to understand the current task.

Reveal secondary details when relevant.

Never hide information necessary for financial, operational, or data correctness.

### 4.3 Calm Minimalism

The application should feel:

* Professional.
* Clean.
* Lightweight.
* Quiet.
* Approachable.
* Dependable.
* Mobile-first.

Avoid excessive gradients, oversized cards, meaningless metrics, and attention-seeking animations.

### 4.4 Clarity Over Technical Terminology

Users should not need to understand:

* IndexedDB.
* Mutation queues.
* Database transactions.
* Optimistic concurrency.
* Request retries.
* Version conflicts.

Translate these concepts into understandable language.

For example:

Instead of:

`Mutation queue contains 3 pending operations`

Display:

`3 inspections waiting to sync`

Instead of:

`HTTP 409: Version conflict`

Display:

`Someone updated this inspection while you were offline.`

Provide an understandable recovery action.

### 4.5 Honest Feedback

Clearly distinguish between:

* Changes not yet saved.
* Saved on this device.
* Ready to synchronize.
* Synchronizing.
* Synchronized with the server.
* Unable to synchronize.
* Conflict requiring attention.

Never use a successful server synchronization indicator before receiving and durably processing server acknowledgment.

### 4.6 Mobile-First Interaction

Optimize the interface for smartphones.

Consider:

* Outdoor lighting.
* Touch interaction.
* One-handed operation.
* Large enough touch targets.
* Readable typography.
* Limited user attention.
* Slow devices.
* Network instability.

Follow accessible design practices.

Do not rely on color alone to communicate status.

---

# 5. VISUAL DESIGN DIRECTION

Create a cohesive visual identity for Fieldnest.

## Appearance

Use a restrained, contemporary interface.

Suggested visual direction:

* Warm off-white or neutral backgrounds.
* Charcoal or dark slate text.
* Muted green as a functional accent.
* Subtle borders.
* Comfortable spacing.
* Excellent typography.
* Minimal shadows.
* Carefully designed empty states.

These are guidelines, not rigid color specifications.

Maintain appropriate contrast.

## Design System

Create reusable components for:

* Buttons.
* Form inputs.
* Checkboxes and option groups.
* Inspection cards.
* Status indicators.
* Navigation.
* Inline notifications.
* Confirmation dialogs.
* Progress indicators.
* Offline notices.
* Conflict resolution.
* Empty states.
* Error states.

Avoid duplicating visual patterns across screens.

## Primary Screens

Design the smallest coherent navigation structure.

Expected screens:

### Home / My Work

Shows:

* Assigned inspections.
* Unfinished work.
* Work waiting to synchronize.
* Important actions.

### Inspection Form

Allows workers to:

* Answer questions.
* Navigate sections.
* Save automatically.
* Review completion status.
* Return to unfinished work.

### Activity / Sync Status

Shows:

* Locally saved records.
* Pending submissions.
* Successful synchronization.
* Failed submissions.
* Conflicts requiring attention.

### Inspection Details

Shows:

* Inspection information.
* Completion state.
* Answers.
* Submission status.
* Relevant actions.

### Settings

Contains only necessary settings, storage information, and account actions.

Additional screens require justification.

---

# 6. INSPECTION WORKFLOW

Use a predefined property inspection checklist.

Do not build a visual form builder.

A representative inspection may contain:

* Property information.
* General condition.
* Kitchen condition.
* Bathroom condition.
* Electrical and safety checks.
* Additional observations.
* Final review.

Use appropriate input types.

Examples:

* Pass / Fail / Not Applicable.
* Yes / No.
* Short notes.
* Optional comments.

Required fields must be validated.

Workers should understand why a form cannot be completed.

Support saving incomplete drafts.

Do not require users to finish a section before their existing answers can be saved.

Avoid photo uploads in the initial MVP unless there is a compelling reason to include them.

Reliable offline JSON synchronization is already a meaningful engineering challenge.

---

# 7. OFFLINE-FIRST ARCHITECTURE

The client must be designed around local persistence rather than continuous network access.

## Local Database

Use IndexedDB through Dexie.js.

Persist:

* Locally available inspection assignments.
* Inspection answers.
* Draft state.
* Pending synchronization operations.
* Stable operation identifiers.
* Record versions.
* Synchronization metadata.
* Server acknowledgments where appropriate.

Design database schemas with explicit versioning and migration support.

## Atomic Local Changes

When an edit affects both a local record and its synchronization state, persist those changes consistently.

Use IndexedDB transactions where appropriate.

Do not mark a local save as successful before the required storage operation completes.

## Auto-Save

Implement reliable auto-saving.

Use a suitable debounce strategy to reduce unnecessary writes.

Ensure that navigating away, submitting, or changing application state cannot silently discard unsaved changes.

Document the behavior when storage fails.

## Browser Storage Limitations

Investigate and account for:

* Storage quotas.
* Storage eviction.
* Private browsing limitations.
* IndexedDB failures.
* Schema upgrades.
* Browser refreshes.
* Application restarts.
* Multiple open tabs.

Request persistent storage where appropriate, without implying that it provides an absolute durability guarantee.

Handle storage errors visibly.

Never silently discard pending work to reclaim space.

---

# 8. SYNCHRONIZATION ENGINEERING

Synchronization is the primary engineering challenge.

Design and document the synchronization protocol before implementing it.

## Required Guarantees

### Idempotency

Repeated delivery of the same logical operation must not produce duplicate effects.

Assign each operation a stable unique identifier.

Store processed operation identifiers server-side.

Enforce idempotency through database constraints and transactions.

### Atomicity

Server-side mutation processing must be atomic.

A partially processed operation must not leave an inconsistent inspection record.

### Optimistic Concurrency

Use record versioning.

A client submits its expected base version.

The server checks the current version before accepting the update.

Conflicting updates must be detected.

### Retry Safety

If the client loses connectivity after sending a request, it must be able to retry safely.

Use stable operation identifiers across retries.

### Acknowledgment Handling

Only remove or finalize pending operations after processing the server acknowledgment and persisting the resulting local state.

If the server commits an operation but the acknowledgment is lost, retrying must return the previously committed result without creating a duplicate effect.

### Failure Isolation

One failed operation should not permanently block unrelated valid operations.

Preserve necessary ordering for dependent operations affecting the same record.

### Network Efficiency

Avoid retransmitting unnecessary information.

Use appropriate batching, pagination, or incremental synchronization where justified.

Measure network overhead before introducing complex optimizations.

---

# 9. CONFLICT RESOLUTION

Support a realistic conflicting-edit scenario.

Example:

1. Inspector A opens an inspection.
2. Inspector B opens the same authorized inspection on another device.
3. Both receive version 3.
4. Inspector A updates the inspection.
5. The server accepts the update and creates version 4.
6. Inspector B attempts to synchronize an update based on version 3.
7. The server detects a version mismatch.
8. Fieldnest preserves Inspector B's local changes.
9. The UI displays the conflicting information.
10. The user reviews and resolves the conflict.

## Initial Strategy

Prefer record-level optimistic concurrency with manual resolution.

Do not automatically overwrite a newer server version.

Do not automatically merge records unless the merge is demonstrably safe.

The conflict interface should show:

* The current server version.
* The user's locally saved changes.
* The differences.
* Clear resolution options.

If the user chooses to apply local changes, submit a new version-checked operation.

Ensure concurrent resolution attempts cannot silently overwrite one another.

Do not introduce CRDTs for this MVP.

Document the decision and its tradeoffs.

---

# 10. SECURITY REQUIREMENTS

Use Supabase Authentication for connected accounts.

Implement appropriate PostgreSQL Row Level Security policies.

A user must not access records belonging to unauthorized users or inspection assignments.

Server-side operations must validate:

* Authentication.
* Authorization.
* Record ownership or authorized assignment.
* Input structure.
* Allowed values.
* Record versions.
* Mutation identifiers.

Do not trust frontend validation alone.

Document offline authentication limitations.

Previously cached data must not become accessible to another account merely because the active session changes.

Use account-scoped local persistence and carefully defined sign-out behavior.

Never silently delete unsynchronized data during logout.

Explicitly document that browser-based storage does not automatically provide strong protection for confidential data on a compromised or shared device.

Use fictional inspection data in the public demo.

---

# 11. PERFORMANCE ENGINEERING

Build an efficient application, not merely a functioning one.

## Frontend

Focus on:

* Small production bundles.
* Efficient component rendering.
* Appropriate code splitting.
* Avoiding unnecessary state updates.
* IndexedDB query performance.
* Efficient list rendering.
* Low-cost form interactions.
* Responsive operation on modest mobile devices.

## Synchronization

Focus on:

* Avoiding redundant requests.
* Small payloads.
* Appropriate retry delays.
* Exponential backoff with jitter.
* Avoiding duplicate concurrent synchronization workers.
* Efficient server queries.
* Proper database indexes.

## Multi-Tab Behavior

Prevent separate application tabs from corrupting local state or creating uncontrolled competing synchronization attempts.

Use suitable browser coordination mechanisms.

All server operations must remain idempotent regardless of client coordination.

## Performance Verification

Establish measurable targets for:

* Local save latency.
* Application startup.
* Time to interactive.
* Synchronization duration.
* Network bytes transferred.
* Database operation latency.
* Recovery after interrupted synchronization.

Collect real measurements.

Do not invent benchmark results.

Avoid optimizing components without a demonstrated need.

---

# 12. TESTING STANDARDS

Testing is not optional.

Each milestone must include tests appropriate to the functionality implemented.

The most important requirement is proving that offline workflows remain correct during failures.

## Mandatory Failure Scenarios

Test:

1. Connectivity disappears during form entry.
2. The browser refreshes after a saved edit.
3. Connectivity disappears during submission.
4. A server response is lost after successful processing.
5. The same operation is submitted repeatedly.
6. Synchronization is interrupted and later resumed.
7. Two authorized clients update the same record.
8. One operation fails while others succeed.
9. Invalid records are rejected.
10. Unauthorized users cannot retrieve another user's records.
11. Two browser tabs operate simultaneously.
12. IndexedDB encounters a storage error.

Use deterministic automated tests wherever possible.

Database integration tests must verify actual transactional behavior.

Avoid relying exclusively on mocked APIs to prove server correctness.

For browser tests, simulate offline operation using Playwright.

---

# 13. PWA REQUIREMENTS

Fieldnest must be installable where supported.

Implement:

* Web app manifest.
* Service Worker.
* Appropriate icons.
* Responsive application shell.
* Offline navigation.
* Cached static resources.
* Update handling.
* Correct GitHub Pages scope and asset paths.

Cache application resources necessary for offline operation.

Store inspection records in IndexedDB.

Do not indiscriminately cache authenticated API responses in the service worker.

Do not depend on Background Sync for application correctness.

Implement synchronization primarily when the application is active, such as on:

* Application startup.
* Connectivity restoration.
* Application visibility changes.
* Explicit user request.
* Appropriate retry scheduling while active.

Background Sync may be an optional enhancement when supported.

Do not promise synchronization while the browser is completely closed.

---

# 14. PROJECT ARCHITECTURE AND CODE QUALITY

Use a simple, maintainable project structure.

Separate responsibilities such as:

* UI components.
* Pages.
* Domain models.
* Local persistence.
* Synchronization engine.
* Remote API access.
* Authentication.
* Validation.
* Tests.
* Database migrations.

Prefer small, well-defined modules.

Use explicit TypeScript types.

Avoid unnecessary `any` types.

Avoid circular dependencies.

Use stable interfaces between persistence, synchronization, and presentation layers.

Do not introduce a complex state management library unless necessary.

Document significant architectural choices.

---

# 15. DEVELOPMENT DOCUMENTATION

Create and maintain:

## AGENTS.md

Contains instructions for future coding agents.

Include:

* Project objectives.
* Architecture principles.
* Development commands.
* Testing requirements.
* Scope restrictions.
* Coding conventions.
* Milestone workflow.

## PROJECT_SPEC.md

Contains:

* Product definition.
* Target users.
* Functional requirements.
* Nonfunctional requirements.
* Data integrity guarantees.
* Acceptance criteria.
* Out-of-scope features.

## context.md

Contains:

* Current milestone.
* Completed milestones.
* Implemented functionality.
* Relevant file paths.
* Recent architectural decisions.
* Verification results.
* Known issues.
* Exact next steps.

This file is essential for development continuity.

## docs/ARCHITECTURE.md

Document the implemented architecture.

## docs/SYNC_PROTOCOL.md

Document synchronization semantics, identifiers, versioning, acknowledgment handling, and conflict resolution.

## docs/DECISIONS.md

Record significant architectural decisions and their rationale.

## README.md

Maintain a clear, professional GitHub README.

Explain the application in simple language.

Do not make the README read like an academic research paper.

---

# 16. MILESTONE DEVELOPMENT PLAN

Development must proceed sequentially.

Do not implement every milestone in a single session.

Each milestone must produce verifiable working functionality.

## M0 — Repository Foundation and Deployment

**Objective:** Establish a clean development foundation and a working GitHub Pages deployment.

Implement:

* React, TypeScript, and Vite setup.
* Tailwind CSS.
* Basic project structure.
* Initial Fieldnest visual identity.
* Responsive application shell.
* Placeholder navigation for planned screens.
* PWA configuration.
* GitHub Pages-compatible routing and base path.
* GitHub Actions CI/CD.
* Testing infrastructure.
* Type checking and linting.
* Documentation files.
* Environment variable examples.
* Git initialization.

Initialize the repository on `main`.

If GitHub CLI is authenticated and authorized, create the `fieldnest` repository and push the initial commit.

Otherwise, provide the exact commands required.

Never force-push or overwrite an existing repository.

### Acceptance Criteria

* Development server starts.
* TypeScript checks pass.
* Production build succeeds.
* Tests run successfully.
* Application loads under the GitHub Pages base path.
* Deployment workflow exists and is valid.
* Actual live deployment is verified if access is available.
* Documentation is initialized.

Do not implement the synchronization engine yet.

**Stop after M0.**

---

## M1 — Usable Inspection Interface and Local Persistence

**Objective:** Build the first genuinely usable offline inspection workflow.

Implement:

* My Work screen.
* Inspection details.
* Predefined inspection checklist.
* Local demo data.
* Inspection progress.
* Draft creation and editing.
* IndexedDB persistence.
* Reliable auto-save.
* Form validation.
* Inspection completion.
* Accurate local status indicators.
* Refresh recovery.
* Responsive mobile interface.
* Relevant tests.

The UI must feel like a real product.

Do not postpone the interface until the backend is finished.

### Acceptance Criteria

A user can open Fieldnest, complete part of an inspection, refresh the page, and continue without losing locally acknowledged changes.

After the application has been properly cached, the user can continue the available workflow offline.

The application honestly identifies locally saved data.

---

## M2 — Real Database, Authentication, and Authorization

**Objective:** Establish the server-side foundation for real multi-device use.

Implement:

* Supabase project configuration.
* SQL migrations.
* PostgreSQL schema.
* Inspection assignments.
* Inspection records.
* Users and access relationships.
* Authentication.
* Row Level Security.
* Input validation.
* Database constraints.
* Useful indexes.
* Local development setup.
* Database integration tests.

Provide seed data for a realistic property inspection workflow.

Support at least two authorized test users who can work on the same inspection for future conflict testing.

### Acceptance Criteria

Authorized users can sign in and retrieve their inspections.

Unauthorized users cannot retrieve or modify protected records.

Migrations are reproducible.

Database tests verify important constraints and access policies.

---

## M3 — Durable Synchronization Engine

**Objective:** Implement correct offline-to-server synchronization.

This is a critical engineering milestone.

Implement:

* Persistent operation queue.
* Stable operation identifiers.
* Idempotent server processing.
* Transactional mutation handling.
* Server acknowledgments.
* Client retry behavior.
* Exponential backoff.
* Connectivity recovery.
* Bounded synchronization processing.
* Remote record retrieval.
* Synchronization status UI.
* Relevant integration tests.

Document the synchronization protocol.

### Acceptance Criteria

A record completed offline can later be synchronized to the server.

A second authenticated device can retrieve the synchronized result.

Repeated delivery does not create duplicate effects.

A lost acknowledgment does not cause duplicate writes.

Interrupted operations remain recoverable.

---

## M4 — Conflict Detection and Resolution

**Objective:** Demonstrate safe concurrent editing across disconnected devices.

Implement:

* Record versioning.
* Version-checked updates.
* Conflict detection.
* Preservation of local conflicting changes.
* Conflict comparison interface.
* Manual resolution workflow.
* Safe resubmission.
* Conflict integration tests.

### Acceptance Criteria

Two clients editing the same record cannot silently overwrite one another.

A stale update produces a detectable conflict.

The user can inspect differences and resolve the conflict.

Resolution is saved safely.

The system preserves the information necessary to recover from a failed resolution attempt.

---

## M5 — Reliability and Failure Recovery

**Objective:** Prove that the offline architecture behaves correctly under realistic failures.

Implement and verify:

* Interrupted submission recovery.
* Network timeout handling.
* Lost server acknowledgments.
* Multiple retry attempts.
* Browser refresh recovery.
* Multi-tab synchronization coordination.
* Storage error handling.
* Partial synchronization failures.
* Safe cleanup of acknowledged operations.
* Important edge-case tests.

Improve error messages and recovery UX.

### Acceptance Criteria

Automated tests demonstrate that failures do not silently discard recoverable pending work.

Retry behavior is correct.

Status indicators reflect actual state.

The system remains usable during intermittent connectivity.

---

## M6 — Performance, Accessibility, and UX Refinement

**Objective:** Turn the technically complete application into a polished product.

Review the interface screen by screen.

Improve:

* Visual consistency.
* Navigation.
* Form usability.
* Mobile responsiveness.
* Loading states.
* Empty states.
* Offline notifications.
* Conflict resolution clarity.
* Keyboard accessibility.
* Screen-reader compatibility.
* Perceived performance.
* IndexedDB operations.
* Unnecessary network requests.
* Production bundle size.

Measure performance before and after meaningful optimizations.

### Acceptance Criteria

The application is understandable to a first-time user.

Its primary workflows are easy to complete on a smartphone.

Accessibility problems identified by automated and manual checks are addressed.

Relevant performance measurements are documented.

---

## M7 — Production Deployment and Portfolio Readiness

**Objective:** Deliver a finished, publicly accessible, demonstrable application.

Implement:

* Final GitHub Pages configuration.
* Production environment configuration.
* Deployment verification.
* Production smoke testing.
* PWA installation checks.
* Offline testing on the deployed origin.
* Mobile browser verification.
* Final regression tests.
* Security review.
* README improvements.
* Architecture diagram.
* Synchronization explanation.
* Failure demonstration guide.
* Screenshots.
* Clear setup documentation.

The README should explain:

1. What Fieldnest does.
2. Who it helps.
3. Why offline operation matters.
4. How to try the live application.
5. How synchronization works.
6. How conflicts are handled.
7. How to reproduce reliability tests.
8. What engineering decisions matter.

### Final Acceptance Criteria

The public application works through GitHub Pages.

A visitor can explore local demo mode without backend credentials.

Authenticated users can use real server synchronization when the Supabase backend is configured.

Offline operation works after the required resources have been cached.

The synchronization and conflict-resolution tests pass.

The repository clearly demonstrates the engineering behind the application.

---

# 17. MILESTONE EXECUTION RULES

These instructions apply to every development session.

## Rule 1 — Read Context First

Before implementing anything, read:

1. AGENTS.md
2. PROJECT_SPEC.md
3. context.md
4. docs/ARCHITECTURE.md
5. docs/DECISIONS.md
6. docs/SYNC_PROTOCOL.md, when it exists.

If the project is new, initialize the required documentation.

If existing project files contain meaningful work, preserve that work.

Never overwrite completed functionality unnecessarily.

## Rule 2 — Implement One Milestone

Implement only the requested milestone.

Do not automatically begin the next milestone.

You may create small supporting infrastructure needed by the current milestone.

Avoid implementing unrelated future features.

## Rule 3 — Inspect Before Editing

Understand the existing code before making changes.

Do not create duplicate implementations.

Prefer extending existing modules when appropriate.

## Rule 4 — Maintain Engineering Consistency

Follow established conventions.

Keep components small and coherent.

Avoid unnecessary dependencies.

Avoid speculative generalization.

## Rule 5 — Test Before Declaring Completion

Run the relevant:

* Type checks.
* Lint checks.
* Unit tests.
* Integration tests.
* Production build.
* Browser tests, where appropriate.

If a test cannot run because of missing external credentials or infrastructure, state that explicitly.

Do not report unexecuted tests as passing.

## Rule 6 — Document Progress

After completing the milestone, update `context.md`.

Record:

* Completed work.
* Important design decisions.
* Tests executed.
* Test results.
* Known issues.
* Remaining requirements.
* Next milestone.

Keep documentation synchronized with the actual codebase.

## Rule 7 — Git Discipline

Use meaningful commits.

Examples:

`chore: initialize Fieldnest project`

`feat: implement offline inspection drafts`

`feat: add idempotent synchronization`

`feat: handle concurrent inspection conflicts`

Do not commit:

* Credentials.
* Environment secrets.
* Generated dependency directories.
* Sensitive user data.
* Unnecessary build artifacts.

Push changes when remote access is configured and authorized.

Do not rewrite shared history.

## Rule 8 — Development Continuity

If execution is interrupted or context is lost:

* Inspect the working tree.
* Read `context.md`.
* Identify completed changes.
* Run relevant tests.
* Continue incomplete work.
* Do not restart the milestone unnecessarily.
* Do not discard working changes without a clear reason.

Prefer completing existing partial work over regenerating everything.

---

# 18. REQUIRED RESPONSE FORMAT AFTER EACH MILESTONE

Keep the response concise.

Report:

### Milestone

Name and completion status.

### Implemented

Brief summary of actual changes.

### Verification

Commands executed and results.

### Git

Commit information and push status.

### Deployment

Current deployment status and URL, if verified.

### Blockers

Only genuine blockers, including required external account setup.

### Next

The next milestone to implement.

Do not produce unnecessarily long implementation reports.

The repository documentation should contain detailed technical explanations.

---

# 19. SCOPE RESTRICTIONS

Do not add:

* AI features.
* Analytics dashboards without user value.
* Microservices.
* Kafka.
* Redis.
* Kubernetes.
* A generic workflow engine.
* A visual form builder.
* Complex organization management.
* Real-time collaborative editing.
* CRDTs.
* Unnecessary abstractions.
* Premature scaling infrastructure.

Do not optimize for the appearance of technical complexity.

Optimize for correctness, maintainability, and genuine product value.

Do not treat a successful compilation as proof that synchronization is correct.

Do not claim production-grade durability or browser compatibility without verification.

---

# 20. FINAL ENGINEERING PRINCIPLE

Fieldnest should be easy to understand from the outside and carefully engineered on the inside.

A field worker should experience a simple inspection application.

A software engineer reviewing the repository should discover:

* Sound data modeling.
* Transactional consistency.
* Idempotent operations.
* Optimistic concurrency control.
* Recoverable synchronization.
* Meaningful testing.
* Efficient data access.
* Clear architectural boundaries.
* Honest error handling.
* Maintainable code.

The strongest engineering decision is often choosing the simplest implementation that reliably solves the problem.

---

# IMMEDIATE EXECUTION INSTRUCTION

Begin with **M0 — Repository Foundation and Deployment**.

First, inspect the current working directory.

If the repository is empty, initialize Fieldnest.

If existing work is present, inspect it before modifying anything.

Create the necessary project structure, initial application shell, testing infrastructure, GitHub Pages deployment configuration, and documentation.

Verify the implementation.

Commit the completed milestone.

Push only when GitHub access is configured and authorized.

Update `context.md` with the exact project state.

**STOP after M0. Do not begin M1 until explicitly instructed.**
