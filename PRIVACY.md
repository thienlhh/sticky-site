# StickySite Privacy Policy

Last updated: September 2026

## Core Principle

**Your saved views stay in your browser.**

Saving and applying views runs entirely locally and requires no user account or product backend. Optional technical analytics can use a separately configured endpoint; the verified default build has no endpoint configured and sends no analytics requests.

---

## 1. Local Storage & Data Retention

- **Saved Views:** Filter configurations, selected options, search terms, and form states that you explicitly save are stored locally on your device via `chrome.storage.local`.
- **Retention & Deletion:** Saved views persist until you delete them or clear your browser extension storage. You can delete individual views at any time directly within the extension popup, or remove all data by clearing extension data or uninstalling the extension via `chrome://extensions`.
- **Session Data:** In-progress view applications and recent restoration results use temporary session storage (`chrome.storage.session`), which automatically clears when your browser session closes.
- **Local-First Architecture & Future Cloud Sync:** Saved views reside strictly on your device. StickySite does not upload or sync your saved views to external servers today. If optional cloud backup or multi-device synchronization is introduced in a future release, it will be strictly opt-in, requiring explicit user consent with updated disclosures and end-to-end encryption.

---

## 2. Browser & Website Permissions

### Extension API Permissions
StickySite uses the minimum necessary browser permissions to provide its functionality:
- `storage`: Persists your saved views and settings locally on your device.
- `scripting` & `activeTab`: Scans form controls on the active page and applies your saved values only when you click or trigger an action.
- `tabs`: Reads the active tab URL and monitors page load completion so it can navigate to the correct page before applying a saved view.
- `favicon`: Displays website icons next to saved views in the popup to help you visually identify them.

### Website Host Access (Least-Privilege)
- **No Blanket Access on Install:** Installing StickySite grants no broad website access. The manifest declares `http://*/*` and `https://*/*` as optional permissions.
- **On-Demand Access Per Origin:** When you save, apply, or update a view on a specific website, StickySite requests permission exclusively for that website's origin (e.g., `https://example.com/*`). Access is never requested for sites where you do not use the extension.

### Proactive Safety Filtering
StickySite automatically detects and strictly excludes sensitive elements and tokens:
- **Excluded Inputs:** Passwords, emails, phone numbers, credit card and payment inputs, file uploads, hidden fields, and one-time authentication codes (OTP / 2FA).
- **Excluded URL Parameters:** Sensitive query tokens such as `token`, `session`, `auth`, `jwt`, `secret`, `sig`, `password`, `code`, and `otp`.
- **No Destructive Actions:** StickySite never clicks "Submit", "Pay", "Buy", "Delete", or confirmation buttons.

---

## 3. Product Analytics & Telemetry

StickySite includes a minimal, privacy-preserving technical analytics framework to measure extension reliability and improve site compatibility.

### What We Collect (Allowlisted Technical Metadata Only)
When analytics is enabled and an endpoint is configured, the extension may transmit only:
1. An anonymous, randomly generated installation identifier (`UUID`).
2. The extension version (e.g., `1.0.0`).
3. Standard event names (`view_apply_started`, `view_apply_full`, `view_apply_partial`, `view_apply_failed`).
4. Coarse numerical counters:
   - Number of attempted settings (e.g., `3`)
   - Number of restored settings (e.g., `2`)
   - Number of skipped settings (e.g., `1`)
5. Coarse failure category (e.g., `no_match`, `permission_denied`, `timeout`, `restore_failed`).
6. Event timestamp.

### What We NEVER Collect
StickySite strictly forbids and validates against collecting:
- Domain names, website origins, or page URLs
- Query strings, search terms, or URL parameters
- Form control labels, values, placeholders, or form contents
- Element IDs, class names, CSS selectors, or DOM fingerprints
- Keystrokes or webpage text content
- Personal information, IP addresses in application payloads, or browsing history

*(Note: While the application payload never contains an IP address, any network connection to a configured remote server transmits standard transport-level metadata including the connecting IP address to that server.)*

---

## 4. Third-Party Services & Data Sharing

- **No Third-Party Trackers:** StickySite does not embed third-party analytics SDKs (such as Google Analytics or Mixpanel), advertising networks, tracking pixels, or cookies.
- **Zero Data Selling:** Your data is never sold, rented, monetized, or shared with third parties or data brokers.

---

## 5. User Privacy Controls & Opt-Out

You maintain full control over your privacy directly in the extension popup (under **Privacy & Settings**):
- **Toggle Analytics Off:** You can disable analytics at any time. When toggled off, no telemetry is recorded or sent.
- **Reset Anonymous Identity:** You can regenerate your anonymous installation UUID with a single click at any time.
- **Compatibility Report Previews:** If you choose to report a site compatibility issue, StickySite displays the complete JSON technical metadata for your review before you confirm submission.

---

## 6. Policy Updates

We may update this Privacy Policy to reflect improvements or changes to our practices. Any updates will be posted here with a revised "Last updated" date.

---

## 7. Contact Information

If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact:

- **Developer:** Thien Le
- **Email:** [kaoxofu@gmail.com](mailto:kaoxofu@gmail.com)
- **Repository / Support:** [StickySite Feedback](https://github.com/thienlhh/sticky-site-feedback)
