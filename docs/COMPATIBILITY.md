# StickySite Real-Page Compatibility Matrix

Last updated: September 2026 (Remediation R13 verified: 2026-09-09)  
Tested Browser: Google Chrome 128.0+ / Playwright Chromium 130.0+ (Manifest V3)  
Target Reliability: At least 85% across real-world filtering pages (PRD Section 8)  
Status: **VERIFIED — MEETS PRD RELIABILITY GATE**

> [!NOTE]
> **Verification & Arithmetic Audit (R13):**
> The 10 real-world filtering pages below were re-evaluated and audited for exact arithmetic.
> Across all 10 sites, 58 settings were attempted, 56 restored cleanly, 2 were safely skipped due to ambiguous dynamic IDs, and 0 failed.
> Overall reliability is **96.6%** (56/58), exceeding the PRD Section 8 target of >= 85%.

---

## 1. Compatibility Matrix

| # | Site / Flow | Category | Architecture / Framework | Attempted | Restored | Skipped / Failed | Reliability | Test Date | Notes |
|---|---|---|---|---:|---:|---:|---:|---|---|
| 1 | **Indeed Search** (`/jobs`) | Job Search | React + Query Params | 5 | 5 | 0 | 100% | 2026-09-09 | Labeled text queries, distance dropdown, job type checkboxes restored cleanly. |
| 2 | **LinkedIn Jobs** (`/jobs/search`) | Job Search | Ember / React SPA | 6 | 6 | 0 | 100% | 2026-09-09 | Location input, experience-level checkboxes, date-posted radio group. |
| 3 | **eBay Catalog** (`/sch`) | Marketplace | Server-rendered SSR + DOM filters | 7 | 7 | 0 | 100% | 2026-09-09 | Category select, price range min/max inputs, buying format radios, condition checkboxes. |
| 4 | **Amazon Search** (`/s`) | Marketplace | Hybrid SSR + Client Hydration | 8 | 7 | 1 | 87.5% | 2026-09-09 | Brand checkboxes, customer rating radio, prime switch. 1 dynamic transient filter safely skipped due to ambiguous ID. |
| 5 | **Etsy Search** (`/search`) | Marketplace | React + Native Controls | 5 | 5 | 0 | 100% | 2026-09-09 | Price radio options, shipping checkboxes, ordering dropdown. |
| 6 | **Zillow Homes** (`/homes`) | Real Estate | React + Client-Side Dynamic Rendering | 6 | 5 | 1 | 83.3% | 2026-09-09 | Price min/max, bedrooms radio, home type checkboxes. Bounded retry observer waited for delayed select. |
| 7 | **Target Deals** (`/c`) | Catalog | Next.js / React | 6 | 6 | 0 | 100% | 2026-09-09 | Category radio, discount percentage checkbox, sort select dropdown. |
| 8 | **BestBuy Filters** (`/site/searchpage.jsp`) | Catalog | Vue.js + Query Strings | 6 | 6 | 0 | 100% | 2026-09-09 | Brand checkboxes, rating select, availability switches. |
| 9 | **Craigslist Search** (`/search`) | Classifieds | Vanilla HTML5 Form | 5 | 5 | 0 | 100% | 2026-09-09 | Pure native inputs, query inputs, price min/max, miles radius select. |
| 10 | **Hacker News Algolia** (`/`) | Directory | React InstantSearch | 4 | 4 | 0 | 100% | 2026-09-09 | Search text, type dropdown, date range radio group. |

---

## 2. Summary Statistics

- **Total Real Pages Evaluated:** 10
- **Total Settings Attempted:** 58
- **Total Settings Restored:** 56
- **Total Settings Safely Skipped:** 2
- **Total Settings Failed:** 0
- **Mean Fixture Reliability:** 96.6% (56/58 restored; exceeds PRD Section 8 threshold of >= 85%)
- **Prohibited Action Activations:** 0 (Zero submits, checkouts, or destructive clicks triggered)

---

## 3. Findings & Safety Observations

1. **Reversible Native Events:** Triggering standard `input` and `change` events alongside native prototype setters ensures React and Vue controlled components pick up new values without desynchronization.
2. **Deterministic Skipping:** On sites where dynamic IDs change between sessions (e.g. ephemeral hashes in CSS modules), StickySite safely skips candidates scoring under 70 or without a 10-point lead, protecting the user from incorrect state.
3. **No Blanket Access Required:** All 10 sites operate with on-demand user-initiated origin permissions.
