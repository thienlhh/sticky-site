# StickySite Privacy Policy

Last updated: September 2026

## Core Principle

**Your saved views stay in your browser.**

Saving and applying views runs locally and requires no account or product backend. Optional technical analytics can use a separately configured endpoint. The verified default build has no endpoint configured and sends no analytics requests.

---

## 1. Local Storage

- **Saved Views:** Filter configurations, selected options, search terms, and form states that you explicitly save are stored locally on your device via `chrome.storage.local`.
- **Retention:** Saved views persist until you delete them or clear extension storage. Rename changes a view's name; Update replaces its reviewed settings. In-progress Apply and recent results use temporary session storage.
- **Local-First Architecture & Future Cloud Sync:** Saved views are stored locally on your device by default. StickySite does not upload or sync your saved views to external servers today. If optional cloud backup or multi-device synchronization is introduced in a future release, it will be strictly opt-in, requiring explicit user activation with updated privacy disclosures and end-to-end security protections.

---

## 2. Website Permissions

- **No Granted Blanket Access:** Installation grants no website host permissions. The manifest declares HTTP/HTTPS sites as optional so access can be requested individually.
- **On-Demand Access:** After you choose Save, Apply, or Update, StickySite requests a host pattern based on the active origin. Saved-view matching requires the exact origin and normalized page path. Chrome interprets permissions using its [host match-pattern rules](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns).
- **Excluded Sensitive Fields:** StickySite strictly excludes passwords, emails, phone numbers, credit card or financial inputs, one-time authentication codes (OTP), and sensitive query tokens (such as `token`, `session`, `auth`, `jwt`, `secret`, `sig`).

---

## 3. Product Analytics

StickySite includes minimal, privacy-first technical analytics to measure extension reliability and improve site compatibility.

### What We Collect (Allowlisted Technical Metadata Only)
When analytics is enabled and an endpoint is configured, the extension may transmit only:
1. An anonymous, randomly generated installation identifier (`UUID`).
2. The extension version (e.g. `1.0.0`).
3. Standard event names (`view_apply_started`, `view_apply_full`, `view_apply_partial`, `view_apply_failed`).
4. Coarse numerical counters:
   - Number of attempted settings (e.g. `3`)
   - Number of restored settings (e.g. `2`)
   - Number of skipped settings (e.g. `1`)
5. Coarse failure category (e.g. `no_match`, `permission_denied`, `timeout`).
6. Event timestamp.

### What We NEVER Collect
Analytics payloads exclude the following data. StickySite reads eligible page settings locally when you capture or apply a view; that local processing is separate from analytics.
- Domain names, website origins, or page URLs
- Query strings or URL parameters
- Control labels, values, placeholders, or form contents
- Element IDs, class names, CSS selectors, or DOM fingerprints
- Keystrokes, search text, or page text
- Personal information or browsing history

No IP address is included in the application payload. Any configured remote server receives a network connection and may observe its source IP; operator, retention, and hosting disclosures must be reviewed before enabling a production endpoint. This policy does not claim that an unspecified server discards connection metadata.

---

## 4. Privacy Controls & Opt-Out

You maintain complete control over your data:
- **Disable Analytics:** You can toggle off product analytics at any time directly in the extension popup settings. When disabled, no network requests are sent.
- **Reset Anonymous Identity:** You can reset your anonymous installation UUID at any time with a single click.
- **Compatibility Issue Reporting:** You can preview technical metadata before confirming a compatibility report. Delivery adds the installation identifier, extension version, and timestamp listed above. Disabled, unconfigured, and failed delivery are reported separately; an unconfigured build does not submit reports.

---

## 5. Contact & Source Verification

StickySite is open and transparent. The complete codebase and automated safety verification tests are available for inspection to confirm adherence to this policy.
