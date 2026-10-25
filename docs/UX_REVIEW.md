# M6 interface and performance review

Scope: refine the working M0–M5 product. No new inspection lifecycle, synchronization engine, cloud schema or M7 portfolio expansion.

## Screen review

| Screen | Refinement and checks |
| --- | --- |
| My work / first visit | Clear local-demo/connected separation retained; muted text contrast corrected; Account is reachable from persistent navigation |
| Inspection | Keyboard focus follows section/review changes; missing-answer actions reopen the relevant section; notes have associated help; readable touch controls stack at 320px |
| Review / completed copy | Missing-answer guidance remains actionable; completed records stay locked and downloadable; both states receive automated accessibility checks |
| Activity / Settings | Existing local-only labels retained; typography/contrast improved; keyboard navigation and automated scans cover both screens |
| Account / connected editor | Heading no longer says to sign in after signing in; selected inspection receives focus; notes have help and a usable mobile height; disabled sign-in and offline notices are checked |
| Conflicts / recovery | Review receives focus; table typography improved; explicit copy choices and preserved history retained; actual connected desktop/mobile conflict screens receive accessibility scans |
| Loading / empty / failures | Existing honest notices and recovery actions retained; refresh indicates busy/disabled state and avoids duplicate refresh work; no fake sync or destructive recovery introduced |

Automated checks use axe-core through Playwright with WCAG 2 A/AA and 2.1 AA tags. The baseline reported color-contrast violations in muted navigation/footer/help and welcome text; the palette was darkened without suppressing rules. Keyboard checks exercise Enter, radio arrow keys, focused section headings, missing-answer recovery, 44px option targets and 320px reflow. Reduced-motion preferences are respected. These checks do not establish full WCAG conformance or substitute for a screen-reader user evaluation.

## Measurement method

Run `npm run build`, then `npm run measure:ui -- current`. This starts a local production preview, uses disposable Chromium contexts and fictional demo data, and writes ignored `.local/m6/current.json`. It does not access a hosted account. Source queue code is separately bundled through Vite for the synthetic IndexedDB check; UI timings exercise the production build. Port 4175 must be free.

UI samples: three fresh contexts each for desktop Chromium and Pixel 7 emulation, no CPU/network throttling. Ready time includes navigation until the Try Fieldnest control appears. Save-interaction time includes browser automation, selecting an answer and observing the acknowledged device-save indicator; it is not an isolated disk-write benchmark. First paint uses the browser's first-contentful-paint entry. Timings are local observations with a small sample, not universal startup guarantees.

Queue samples: 20 calls to the actual ConnectedDatabase.claim implementation in native browser IndexedDB, with 1,000 delayed operations containing 5,000-character fictional notes each. This measures the idle/no-due-work case that the active worker polls. The original implementation materialized every payload. The refinement seeks the existing nextAttempt index and filters only due candidates; live leases, blocked work and per-record ordering safeguards remain intact. No schema migration is required.

Reference targets on this local harness: initial JavaScript below 130 KiB gzip; work-ready median below 1 second; save-interaction median below 500ms; idle synthetic queue-claim median below 20ms. These are reference budgets, not device guarantees or noisy CI timing gates. Compare measurements on the same host before making further optimizations.

## Network and caching

Assignment refresh skips record downloads that cannot replace a dirty/pending/blocked/conflicting copy or an unsaved memory buffer. Clean records still refresh through authorized APIs. A guard coalesces refreshes in the same workspace effect. Connected failure tests verify that explicitly refreshing a pending fixture issues no redundant record GET. Authorization, mutation UUIDs and server acknowledgments are unchanged.

Secondary local pages are lazy-loaded. Workbox still precaches all production chunks for offline routes, so smaller initial execution is not a claim of smaller total offline download. No API responses or private records enter the service-worker cache. The accessibility dependency is development/test-only.

Final measurements, verification and deployment evidence are recorded in context.md. Physical mobile hardware, Safari/Firefox and assistive-technology testing remain unverified; manual hosted offline/second-device testing remains explicitly skipped by the owner. M7 has not begun.

## Recorded comparison — 2026-10-26 (Asia/Karachi)

| Measurement | M5 baseline | Final M6 candidate |
| --- | ---: | ---: |
| Initial main JavaScript, gzip bytes | 125,899 | 123,441 |
| Lazy account JavaScript, gzip bytes | 68,686 | 68,903 |
| Full offline precache, KiB | 679.39 | 682.83 |
| Desktop work-ready median, ms | 459.2 | 473.8 |
| Mobile-emulated work-ready median, ms | 468.8 | 391.6 |
| Desktop save-interaction median, ms | 149.7 | 149.2 |
| Mobile-emulated save-interaction median, ms | 269.5 | 127.1 |
| Desktop first-contentful-paint median, ms | 392 | 320 |
| Mobile-emulated first-contentful-paint median, ms | 324 | 336 |
| Synthetic idle queue claim median, ms | 150.9 | 1.8 |
| Synthetic idle queue claim p95, ms | 192.3 | 4.0 |

The queue improvement is specific to the delayed-record workload. The initial bundle is 2,458 gzip bytes smaller, while the total offline cache grew slightly with refinements and route chunks. UI results vary: desktop ready and mobile paint did not improve in this sample. Do not claim a universal startup speedup. All reference budgets were met on this host. Baseline/final JSON files remain ignored under .local/m6; these are measured values, not estimated benchmarks.
