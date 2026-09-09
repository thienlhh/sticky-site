# StickySite real-page compatibility

**Release gate: OPEN.** Three pages have limited restoration evidence; ten passing pages and the 85% real-page gate have not been established. Earlier unsupported 58/56 totals are superseded by these observations.

Checked 2026-09-09 in isolated, anonymous Chromium 153.0.8010.12 on macOS arm64 / Apple M1. Exact URLs, timestamps, redirects, HTTP responses, reviewed settings, and outcomes are retained in the [availability record](evidence/2026-09-09/real-page-availability.json) and [restoration record](evidence/2026-09-09/real-page-restoration.json).

| Page / flow | Observed access or result | Apply attempts | Reported restored | Independently verified changed controls |
|---|---|---:|---:|---:|
| Indeed jobs, engineer query | HTTP 403, blocked | — | — | — |
| LinkedIn jobs, engineer query | Save reviewed three query entries; no eligible text control captured for the perturbation step. Apply untested. | — | — | — |
| eBay search, keyboard | HTTP 403 | — | — | — |
| Amazon search, keyboard | HTTP 503 | — | — | — |
| Etsy search, keyboard | HTTP 403 | — | — | — |
| Zillow homes | HTTP 403, access denied | — | — | — |
| Target deals / Video Game Sale | Search restored to empty; text-typed email signup field excluded after fix | 1 | 1 | 1 |
| BestBuy search, keyboard | Navigation timed out at 15 seconds | — | — | — |
| Craigslist SF Bay search, keyboard | Search restored to `keyboard`; two query entries verified by coordinator | 3 | 3 | 1 |
| HN Algolia search, keyboard | Search restored to `keyboard`; one query entry verified by coordinator | 2 | 2 | 1 |

The three completed runs report **6/6 settings restored**, including **3/3 deliberately changed search fields** independently checked by the harness. The other three settings are query entries that may already match. This small, selected sample is not the ten-page reliability gate. Inaccessible or incomplete pages have no restoration denominator and are not counted as passes.

## Reproduction and boundaries

1. Build the production extension with `npm run build`.
2. Run `node --experimental-strip-types e2e/real-pages.mjs` from the repository root. It writes `test-results/real-page-restoration.json` and does not overwrite this dated evidence.
3. The runner launches an isolated extension profile, opens each accessible public flow, captures through Save Current View, reviews all eligible settings, and saves through the popup UI.
4. It changes one captured text field to `sticky site test`, applies through the popup, reads the background result, and independently compares that field's final value with its saved value. General website buttons are not invoked by the runner.

CDP grants real `activeTab` access, but `permissions.contains` is stubbed. Native optional-permission dialogs remain unverified. These are narrow search-field checks, not full evaluations of each site's filters, framework, destructive-action safety, or every eligible query-navigation combination. No account login or access-control workaround was attempted.

The [pre-fix record](evidence/2026-09-09/real-page-restoration-before-contact-fix.json) documents the Target email-field discovery. It is diagnostic evidence only; use the final restoration record for current counts.
