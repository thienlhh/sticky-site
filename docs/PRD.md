# StickySite MVP Product Requirements

**Status:** Approved for MVP implementation  
**Platform:** Chrome, Manifest V3  
**Last refined:** 2026-09-06

## 1. Product

StickySite saves the filters and view settings on a webpage and restores them later.

**Core promise:** Save this view. Reapply it later in one click.

The product is:

- user-triggered: it acts only when the user saves, updates, or applies a view
- local-first: saved views remain in Chrome local storage
- least-privilege: website access is requested one site at a time
- safe by default: an uncertain setting is skipped
- compatibility-honest: standard controls work first; custom controls may not

StickySite is not a general browser automation tool.

## 2. Users and Validation Hypothesis

Recruit the initial cohort from recruiters, sourcers, and active job seekers who rebuild searches frequently. Marketplace, real-estate, procurement, and research users are secondary compatibility cohorts.

Primary job:

> When I configure a website exactly how I need it, I want to save that configuration so I can restore it next time instead of rebuilding it.

Secondary job:

> When I maintain several searches on one website, I want named views so I can switch between them.

The MVP hypothesis is that activated users will apply the same view on multiple days. Install count alone is not validation.

## 3. MVP Scope

### Required capabilities

A user can:

1. grant access to the current site without granting access to every site
2. capture supported controls and eligible URL parameters
3. review and exclude captured settings
4. save the remaining settings as a named view
5. see and apply views compatible with the current page
6. receive an accurate full, partial, or failed result
7. rename, update, and delete a view
8. complete the workflow without an account or product backend

### Non-goals

The MVP does not:

- automate workflows, click arbitrary buttons, or submit forms
- monitor pages, run searches, scrape content, or send alerts
- hide or rewrite page content
- auto-apply views
- sync, share, or publish views
- support teams, billing, mobile browsers, Firefox, or Edge distribution
- use site-specific integrations or AI matching

Duplicate View is deferred; Rename, Update, and Delete cover MVP management.

## 4. Compatibility and Page Matching

### Control support

| MVP | Deferred |
|---|---|
| Text, search, number, range, and date/time inputs | Custom comboboxes and dropdowns |
| Checkboxes and radio groups | Custom sliders and complex multi-selects |
| Native single- and multi-selects | Controls requiring menus or drawers to open |
| Labeled ARIA checkbox, radio, and switch controls | Iframes and closed shadow DOM |
| Framework-managed native inputs | Unlabeled or site-specific controls |
| Eligible URL query parameters | Semantic or wildcard URL matching |

An MVP control must be in the top-level document, rendered, enabled, reversible, and meaningfully labeled. StickySite does not run on browser-internal pages, the Chrome Web Store, extension pages, local files, or pages where Chrome blocks script injection.

The product must say:

> Works on many websites. Compatibility depends on how each website implements its controls.

It must not claim universal compatibility.

### Page identity

A view belongs to an origin and normalized pathname. Normalization preserves case and removes only a trailing slash, except at the root. Query parameters and fragments do not determine page identity.

The popup groups views as:

- **Views for this page:** same origin and pathname; Apply and Update are enabled.
- **Other views on this site:** same origin but another pathname; Apply and Update are disabled, while Rename and Delete remain available.

Exact-path matching prevents accidental application to an unrelated page.

## 5. User Experience

### Permission

On first use for an origin:

1. Explain that access is needed to read and restore settings.
2. Request access only after the user selects Allow.
3. Request only the current HTTP or HTTPS origin.
4. Continue scanning after permission is granted.

Denial affects only that origin and shows:

> StickySite needs permission to save and restore settings on this website.

### Save

1. The user configures the page and selects **Save Current View**.
2. StickySite captures supported controls and eligible query parameters.
3. The popup lists each setting with its human-readable label and value.
4. Settings are included by default; the user may exclude any setting.
5. Unsupported items appear as a count, never as raw selectors.
6. The user names and saves the view locally.

Rules:

- At least one setting must remain included.
- Names are trimmed, 1–60 characters, and unique for the page without regard to case.
- A duplicate name prompts the user to rename or update the existing view.
- Unlabeled controls are excluded.
- Unsupported controls do not block saving supported settings.

Target: under 15 seconds after the page is configured.

### Apply

1. The user opens StickySite and selects Apply on a compatible view.
2. StickySite restores eligible URL parameters.
3. After any navigation or rerender, it finds and restores saved controls.
4. It verifies each final value.
5. It reports the result.

Applying requires one click after opening the popup and never more than two. Results are:

- **View applied — 5 of 5 settings restored**
- **View partially applied — 4 of 5 settings restored**
- **Could not apply this view — the website may have changed**

Matching scores and selectors are not shown.

### Manage

- **Rename:** change the name and updated timestamp.
- **Update:** capture and review the current compatible page, then replace the settings while preserving ID, name, and creation time.
- **Delete:** remove the view after confirmation.

The popup must also handle no views, no supported settings, denied permission, unavailable pages, storage quota, unknown schema versions, and failed application. Every error explains the next useful action.

## 6. Capture, Privacy, and Storage

### Eligible values

Store values in DOM-compatible form:

| Control | Stored value |
|---|---|
| Text-like, numeric, range, and date/time input | Raw string |
| Checkbox or switch | Boolean |
| Radio group or single select | Selected value |
| Multi-select | Array of selected values |

Exclude password, email, telephone, file, hidden, color, button, submit, reset, and image inputs; password, one-time-code, and payment autocomplete fields; disabled controls; contenteditable regions; iframes; and unlabeled controls.

Resolve labels in this order:

1. associated label
2. aria-labelledby
3. aria-label
4. name or placeholder
5. concise text in the same field container

If none is useful, exclude the control.

### URL parameters

Capture the current query parameters except:

- the URL fragment and URL credentials
- names matching an exact or common credential form, including auth, authorization, token, access_token, accessToken, refresh_token, refreshToken, session, sessionId, sid, jwt, secret, signature, sig, password, passcode, otp, and code

Do not use broad substring matching: benign names such as zipcode must remain eligible. The Save screen exposes every included parameter for review.

On Apply:

- origin and pathname must already match
- captured eligible parameters replace the current eligible query string
- current sensitive parameters and the fragment remain untouched
- no cross-origin or cross-path navigation occurs

If the query changes, navigate once and resume control restoration after the page is ready.

### Stored view

Each view stores:

- schemaVersion: 1
- UUID generated by the browser cryptography API
- name, origin, and pathname
- query parameter map preserving repeated values
- ordered control records containing kind, label, value, and fingerprint
- ISO 8601 createdAt and updatedAt timestamps

Persistent data uses chrome.storage.local. Temporary Apply state may use chrome.storage.session so a query navigation can complete. Unknown future schema versions remain untouched and are reported as unsupported. A failed validation or write must not overwrite an existing view.

Saved views may contain search terms because those values are the feature’s purpose. They remain local until the user updates, deletes, or clears them.

Use the claim:

> Your saved views stay in your browser.

Do not claim that StickySite collects nothing while remote analytics are enabled.

## 7. Fingerprinting and Restoration

### Fingerprints

A fingerprint combines:

- control kind, tag, input type, and ARIA role
- normalized accessible label
- name
- ID or stable semantic attribute
- option set where applicable
- concise parent-region context
- ordinal among similar controls

A generated class list, full DOM path, or CSS selector alone is insufficient.

### Matching

A candidate must match the saved control family, then receives up to 100 points:

| Signal | Points |
|---|---:|
| Accessible label | 35 |
| Kind, type, and role | 20 |
| Name | 15 |
| ID or stable semantic attribute | 15 |
| Parent region or option set | 10 |
| Ordinal | 5 |

Apply only when the best candidate scores at least 70 and leads the next candidate by at least 10. Otherwise skip the setting. Change these thresholds only when fixture evidence shows a better safety and reliability tradeoff.

### Applying values

StickySite:

- uses native value or checked setters where applicable
- dispatches standard input and change events
- uses click only for a recognized checkbox, radio, or ARIA state control whose state must change
- matches select options by value, then normalized label
- never clicks a general button or link
- verifies the final observable value before reporting success

It never invokes form submission.

### Bounded retries

After the document is ready, unresolved settings may be retried during a maximum five-second window. A MutationObserver runs only during Apply and disconnects on completion or timeout.

The whole Apply operation, including one URL navigation, times out after ten seconds and reports the result so far.

MVP has no continuous SPA monitoring. The popup evaluates the active URL when opened, and scanning occurs only during Save, Update, or Apply.

## 8. Safety, Reliability, and Performance

### Safety invariants

StickySite never intentionally:

- submits a form
- triggers purchase, payment, checkout, send, delete, or confirmation actions
- activates a control not confidently identified as reversible state
- applies across origins or pathnames
- retries indefinitely

When safety and completion conflict, skip the setting.

### Result definitions

| Result | Definition |
|---|---|
| Restored setting | Expected value is observable before timeout |
| Skipped setting | No safe, confident candidate is found |
| Failed setting | Confident candidate does not reach the expected value |
| Fully applied view | Every attempted setting is restored |
| Partially applied view | At least one, but not all, settings are restored |
| Could not apply | No setting is restored or the page is incompatible |

Reliability equals restored settings divided by all attempted saved settings. Skipped and failed settings remain in the denominator; settings excluded before saving do not.

### Launch targets

- At least 95% reliability across supported native-control fixtures.
- At least 85% reliability across the real-page compatibility matrix.
- Zero prohibited actions in safety fixtures.
- Popup interactive within 200 ms on a typical development machine.
- Typical scan under 100 ms on a fixture with up to 200 controls.
- No scanning or DOM observation while inactive.
- Normal local data below 10 MB, with graceful quota handling.

Performance results state browser version, machine, fixture size, and sample count.

## 9. Accessibility

The popup uses semantic controls and headings, supports every flow by keyboard, preserves visible focus, labels every field, and announces results through an aria-live region. Text meets WCAG AA contrast; primary targets are at least 44 by 44 CSS pixels; status never relies on color alone; destructive actions are distinct and confirmed.

## 10. Architecture

Use:

- Chrome Manifest V3
- TypeScript, Vite, WXT, and React for the popup
- Tailwind CSS for styling
- shadcn/ui with Base UI primitives for popup components
- a background service worker
- on-demand content-script injection
- chrome.storage.local and chrome.storage.session
- Vitest for deterministic engine tests
- Playwright for extension workflows

Add only the shadcn/ui components used by the popup and commit their generated source. Do not add a second component system, CSS-in-JS, a product backend, an account system, or a general automation framework for MVP.

Responsibilities:

- **React popup:** lists views, collects names and capture selections, starts actions, manages analytics settings, and presents status.
- **Service worker:** coordinates permissions, navigation, messages, transient Apply state, and analytics delivery.
- **Content script:** scans, labels, fingerprints, matches, restores, and verifies controls only when requested.
- **Storage module:** validates schemas and performs create, update, rename, and delete without destructive partial writes.

## 11. Analytics and Product Decision Gate

### Analytics

Remote analytics may send only:

- random installation ID, extension version, event name, and timestamp
- counts of captured, attempted, restored, and skipped settings
- locally calculated distinct-site count bucket
- coarse failure category

Never send origins, URLs, query data, control labels or values, page content, view names, selectors, fingerprints, or keystrokes.

Required events are extension_installed, site_permission_granted, save_view_started, view_created, view_apply_started, view_apply_full, view_apply_partial, view_apply_failed, view_updated, and view_deleted.

Analytics uses a service-worker adapter. Missing build configuration selects a no-op adapter. Production analytics is enabled by default only when disclosed in the store listing, privacy policy, and onboarding. The popup provides an off switch and a way to clear the analytics identity.

A compatibility report is sent only after explicit confirmation that previews the exact technical metadata. It still excludes page content and saved values.

### Metrics

| Metric | Definition | Target |
|---|---|---:|
| Activation | Legitimate install creates a view | 40% |
| Seven-day retention | Activated user applies a view on days 2–7 | 40% |
| Weekly reused view | Same view applied on two distinct days in the first seven days | 30% |
| High repeat | Activated user applies views at least three times in seven days | 30% |
| Multi-site use | Views created or applied on at least two origins, calculated locally | 10% |

The primary KPI is Weekly reused view among activated users with a complete seven-day observation window.

Evaluate after 100–300 legitimate installs and at least two weeks. Continue only when real-use reliability is at least 85%, weekly reused view reaches 30%, and users try or request additional sites.

Pivot toward the strongest vertical if repetition is strong but multi-site demand is absent. Stop or materially reposition if activation is below 20%, reuse on another day is below 15%, most users never apply a saved view, or reliability remains below 80% after focused compatibility work.

## 12. Verification and Delivery

### Automated tests

Capture and restoration fixtures cover all MVP control types, repeated query parameters, framework-controlled native inputs, and labeled ARIA state controls.

Matching fixtures cover moved elements, changed classes or IDs, inserted siblings, duplicate labels in separate regions, changed surrounding markup, and ambiguous candidates that must be skipped.

Workflow tests cover permission grant and denial; save, browser restart, and apply; query navigation; partial and failed application; SPA rerender during the bounded window; update, rename, and delete; quota and schema errors; and disabled analytics.

Safety fixtures include Submit, Buy, Send, Delete, Confirm, Pay, and Checkout actions. Applying a view must leave every activation counter at zero.

### Real-page matrix

Before release, maintain a dated matrix of at least ten real filtering pages spanning job search, marketplaces, real estate or catalogs, native forms, major frontend frameworks, and query- and DOM-driven filters.

For each page, record browser version, attempted settings, restored settings, failures, and test date. A passing entry is evidence, not a promise of permanent support.

### Engineering work phases

Complete phases sequentially. A phase is complete only when its focused tests and the project-wide check pass.

| Phase | Working outcome | Exit gate |
|---|---|---|
| 0. Scaffold | Loadable React extension with Tailwind, shadcn/ui, and automated checks | Popup loads unpacked; test, typecheck, and production build pass |
| 1. Domain and storage | Validated versioned view records with lossless local CRUD | Storage tests cover invalid data, quota failure, and restart persistence |
| 2. Permission and injection | Current-origin permission followed by runtime content-script execution | Grant and denial paths pass without blanket host access |
| 3. Capture and review | Supported controls and safe URL parameters appear in a review screen | Capture fixtures and exclusion tests pass |
| 4. Save and list | Reviewed settings can be named, saved, and listed by page identity | Save-to-reopen workflow passes |
| 5. View management | Rename, Update, and confirmed Delete work without data loss | Management and failure-path tests pass |
| 6. Matching | Fingerprints select only confident, unambiguous candidates | Scoring boundaries and DOM-change fixtures pass |
| 7. Native restoration | Supported values restore through safe events and are verified | Native reliability reaches 95%; prohibited actions remain zero |
| 8. URL and dynamic restoration | Apply survives one query navigation and bounded rerendering | Navigation, timeout, partial, and failure workflows pass |
| 9. Product hardening | Popup status, accessibility, and performance meet Sections 8 and 9 | Keyboard, screen-reader status, target-size, and performance checks pass |
| 10. Analytics and privacy | Allowlisted events work through a configurable adapter | Payload tests prove prohibited data cannot be emitted |
| 11. Release evidence | Full browser workflow, real-page matrix, onboarding, and privacy policy are ready | Definition of Done and ten-page matrix pass |

Execution details and checkboxes live in tasks/plan.md and tasks/todo.md so implementation progress can change without rewriting product requirements.

Deferred until validation: duplicate views, custom widgets, sync, auto-apply, sharing, teams, community presets, paid plans, additional browsers, and AI matching.

## 13. MVP Definition of Done

The MVP is ready for behavioral validation when:

1. Installation requests no blanket website access.
2. Current-origin access is requested only after a user action.
3. A user can review and save at least one supported setting.
4. Saved data survives restarting Chrome.
5. Only exact-page views can be applied.
6. Apply restores eligible query parameters and controls, then reports verified results.
7. Rename, Update, and Delete work without data loss.
8. Partial and failed restoration produce clear feedback.
9. Analytics sends none of the prohibited data in Section 11.
10. Safety, reliability, performance, accessibility, and automated checks pass.
11. The compatibility matrix has at least ten current entries.
12. The privacy policy accurately describes local data, permissions, and analytics.
13. The workflow requires no account, product backend, or DevTools.

After these conditions pass, release to the initial cohort before expanding scope.
