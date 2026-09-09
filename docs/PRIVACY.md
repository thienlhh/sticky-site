# StickySite Privacy Policy

Last updated: September 2026

## Core Principle

**Your saved views stay in your browser.**

StickySite is designed from the ground up to protect your privacy and personal data. It operates strictly locally inside your browser, requiring no user account, no remote backend, and no blanket website access.

---

## 1. Local Storage

- **Saved Views:** Filter configurations, selected options, search terms, and form states that you explicitly save are stored locally on your device via `chrome.storage.local`.
- **Retention:** Saved views persist until you explicitly rename, update, or delete them, or clear extension storage.
- **No Cloud Synchronization:** StickySite does not synchronize, upload, or backup your saved views or form values to any remote server.

---

## 2. Website Permissions

- **No Blanket Access:** StickySite does not declare or request blanket access to all websites (`<all_urls>` or `*://*/*`).
- **On-Demand Access:** Host permission is requested only for the specific domain of the active tab, and only after you interact with StickySite (such as clicking "Save Current View" or "Apply").
- **Excluded Sensitive Fields:** StickySite strictly excludes passwords, emails, phone numbers, credit card or financial inputs, one-time authentication codes (OTP), and sensitive query tokens (such as `token`, `session`, `auth`, `jwt`, `secret`, `sig`).

---

## 3. Product Analytics

StickySite includes minimal, privacy-first technical analytics to measure extension reliability and improve site compatibility.

### What We Collect (Allowlisted Technical Metadata Only)
When analytics is enabled, the extension may transmit only:
1. An anonymous, randomly generated installation identifier (`UUID`).
2. The extension version (e.g. `1.0.0`).
3. Standard event names (`extension_installed`, `site_permission_granted`, `save_view_started`, `view_created`, `view_apply_started`, `view_apply_full`, `view_apply_partial`, `view_apply_failed`, `view_updated`, `view_deleted`).
4. Coarse numerical counters:
   - Number of captured settings (e.g. `3`)
   - Number of attempted settings (e.g. `3`)
   - Number of restored settings (e.g. `2`)
   - Number of skipped settings (e.g. `1`)
5. Coarse site-count bucket calculated locally without domain names (e.g. `"1"`, `"2-5"`, `"6-10"`, `"10+"`).
6. Coarse failure category (e.g. `no_match`, `permission_denied`, `timeout`).

### What We NEVER Collect
StickySite **never** accesses, logs, or transmits:
- Domain names, website origins, or page URLs
- Query strings or URL parameters
- Control labels, values, placeholders, or form contents
- Element IDs, class names, CSS selectors, or DOM fingerprints
- Keystrokes, search text, or page text
- Personal information, IP addresses, or browsing history

---

## 4. Privacy Controls & Opt-Out

You maintain complete control over your data:
- **Disable Analytics:** You can toggle off product analytics at any time directly in the extension popup settings. When disabled, no network requests are sent.
- **Reset Anonymous Identity:** You can reset your anonymous installation UUID at any time with a single click.
- **Compatibility Issue Reporting:** If a view fails to restore on a site, you may choose to submit a compatibility report. Before sending, StickySite displays the exact technical metadata payload for your inspection and requires explicit confirmation.

---

## 5. Contact & Source Verification

StickySite is open and transparent. The complete codebase and automated safety verification tests are available for inspection to confirm adherence to this policy.
