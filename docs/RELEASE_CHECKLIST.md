# StickySite release evidence

**Status: BLOCKED — not ready for release.** Automated remediation is verified; the outstanding gates below still prevent release. Historical implementation checkmarks do not establish current acceptance.

## Current evidence — 2026-09-09

Final source and bundle hashes, environment, and command outcomes are in [run.json](evidence/2026-09-09/run.json). This identifies the working-tree snapshot over the recorded Git revision; it does not claim uncommitted changes were committed.

- Fresh dependency installation in an isolated source export: `npm ci --offline --no-audit --no-fund`, 245 packages. No existing `node_modules`, `.wxt`, or `.output` was copied. WXT entrypoints now use explicit imports so clean typechecking does not depend on generated globals.
- `npm run check`: 190 tests across 18 files, TypeScript, and the production WXT build pass. [Log](evidence/2026-09-09/check.log).
- The production browser suite uses the native extension action popup, real Save UI, page-agent capture, and background Apply. [Final browser log](evidence/2026-09-09/browser.log).
- Native forced-change sample: 10/10 settings restored and independently asserted across the catalog and safety scenarios, including text, number, single/multiple select, checkbox, and radio. Adversarial hidden/disabled/missing/rejected controls are tested separately; they are not claimed as successful restores.
- Zero Submit, Buy, Send, Delete, Confirm, Pay, and Checkout activations in the instrumented safety fixture.
- Keyboard-only Save and Apply pass with native key input, visible focus, 44px primary targets, and polite result live regions. The corrected empty-state text measures 7.58:1 against white, previously 2.63:1. [Focus screenshot](evidence/2026-09-09/keyboard-focus.png).
- Browser performance samples and their unchanged 200ms popup / 100ms scan thresholds are recorded in the browser log. Popup readiness is measured from the popup document's navigation start after its primary action is enabled; CDP setup time is reported separately. Each opening also exercises the action. Capture measures 200 rendered text inputs, one warmup, then five message round trips.
- [Real-page checks](COMPATIBILITY.md): three changed search fields independently restored, six total settings reported restored. Five pages returned 403/503 and one timed out. LinkedIn Save is observed but Apply remains untested. This does not close the ten-page / 85% gate.
- The Target check exposed an email signup field declared as text. Shared capture/restore eligibility now excludes explicit contact/credential signals in labels and input metadata; a regression proves previously saved fields remain untouched after repurposing. Benign zipcode and email-notification checkboxes remain supported.
- Analytics validates both allowlisted keys and their values, including integer counts, fixed failure categories/site buckets, UUIDs, timestamps, and versions. Arbitrary private strings inside an allowed key are rejected. Default delivery remains unconfigured. Configured transport tests use an injected fetch adapter, not a real production collector.

## Browser coverage and boundaries

The suite covers Save and full browser restart, reviewed Update preserving identity and creation time, same-site management, Rename, Delete cancellation/confirmation, exact-page restrictions, repeated query values, sensitive query/fragment preservation, delayed controls, popup closure/recovery, partial/failed outcomes, timeout cleanup, and final-state verification after asynchronous rejection/query mutation. The production manifest grants no blanket website access and declares no automatic content scripts.

**Permissions:** CDP invocation supplies real `activeTab` access. The already-granted path stubs `permissions.contains`; denial stubs a rejected request. Native Chrome optional-host approval and denial dialogs remain unverified. Production permission and tab-selection code has no testing fallback.

**Accessibility:** Key-driven Save/Apply, a focus screenshot, target measurements, and live-region attributes do not establish all-flow keyboard coverage, screen-reader announcements, or a complete contrast audit.

**Real pages:** Dated public-page observations predate the final analytics-only hardening. Their page-agent bundle matches the final build; both build hashes are recorded. No production analytics endpoint was configured or contacted.

## Outstanding gates

- [ ] **R11:** In a normal Chrome window with a fresh test profile, invoke Save on an HTTP/HTTPS fixture, inspect the requested host, deny and verify no capture/injection; repeat and allow, then Save and restart. The CDP harness cannot certify the native permission dialog.
- [ ] **R12:** Complete keyboard-only Rename, reviewed Update, Delete, Settings, reporting, and recovery; verify modal focus behavior, screen-reader announcements, all primary targets, and full WCAG AA contrast. Include additional range/date and framework-owned native-state fixtures before treating the native sample as exhaustive.
- [ ] **R13:** Complete reproducible restoration on at least ten real filtering pages and meet 85% using every attempted setting. Inaccessible pages stay untested until legitimate access is available.
- [ ] **Analytics enablement:** If enabling remote delivery, test the configured service-worker transport with an actual collector and review operator/retention details, onboarding, store listing, and privacy disclosures. Keep the default build unconfigured until this is complete.
- [ ] **Final release review:** Resolve these gates and review the exact source/build snapshot intended for distribution. No deployment or release was performed.

## PRD Definition of Done mapping

| PRD item | Current evidence / status |
|---|---|
| 1. No blanket installation access | Production manifest assertion passes |
| 2. User-triggered current-origin permission | Unit/simulated browser paths pass; native dialog gate open |
| 3. Review and save a setting | Real Save UI and keyboard scenario pass |
| 4. Survive browser restart | Close/relaunch same isolated profile passes |
| 5. Exact-page Apply | Unit and native-popup incompatible-page checks pass |
| 6. Verified query/control results | Direct/navigation/dynamic/rejection browser scenarios pass |
| 7. Lossless management | Reviewed Update, Rename, Delete cancel/confirm pass |
| 8. Partial/failed feedback | Final values and reported counts asserted |
| 9. Analytics excludes prohibited data | Key/value validation and adapter tests pass; configured deployment review open |
| 10. Safety, reliability, performance, accessibility | Automated evidence above; complete accessibility and broader reliability gates open |
| 11. Ten current compatibility entries | Ten availability observations; only three limited restoration runs, gate open |
| 12. Accurate privacy policy | [Policy](PRIVACY.md) updated for actual local storage, optional permissions, default no-op delivery, timestamps, and transport metadata |
| 13. No account/backend/DevTools required | Product workflow uses popup and local storage; CDP is test tooling only |
