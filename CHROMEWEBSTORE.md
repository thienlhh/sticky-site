# Chrome Web Store Listing — StickySite

> Last Updated: 2026-09-10

---

## Store Listing

**Extension Name** [REQUIRED]
StickySite

**Short Description** [REQUIRED]
Save and restore exact web page views, search filters, and form states in one click.

*(Length: 85 characters / max 132)*

**Detailed Description** [REQUIRED]
Never spend time re-configuring the same search filters, dropdowns, and date ranges again.

StickySite is a privacy-first, local-first extension that captures your current filter settings and form inputs on any website and restores them whenever you return—all in a single click.

Key Features:
- Instant One-Click Restoration: Reapply complex filters and form selections on analytics dashboards, internal tools, and e-commerce sites without re-entering them manually.
- Selective Capture Review: Easily inspect every detected filter and interactive input before saving. Uncheck any specific setting you prefer not to include.
- Cross-Page Navigation: If you are not on the target page, clicking a saved view automatically navigates you to the right URL before applying your settings.
- View Management: Organize multiple custom views per website. Rename views, update existing views with your current page state, or remove old ones anytime.
- Transparent Feedback: Know exactly what was restored. StickySite displays an immediate breakdown of all successfully applied settings and notifies you if a page layout changed.

How to Use StickySite:
1. Open any webpage and set up your desired filters, dropdowns, dates, or search fields.
2. Click the StickySite icon in your toolbar.
3. Review the captured settings, give your view a name (e.g., "Q3 Open Tickets" or "In-Stock Electronics"), and click Save View.
4. Whenever you need those settings again, open StickySite and click your saved view.

Built for Privacy and Safety:
- 100% Local Storage: All saved views stay exclusively in your browser's local storage. There are no user accounts, no cloud sync, and no remote database servers.
- Least-Privilege Permissions: StickySite never asks for blanket browsing permissions on install. Website access is requested only when you choose to save or apply a view on that specific site.
- Sensitive Data Protection: StickySite strictly ignores passwords, credit cards, bank account details, government IDs, phone numbers, and authentication tokens.
- No Destructive Actions: StickySite only populates form inputs. It is programmed to never click submit, buy, pay, delete, or confirm buttons.

Support & Feedback:
For questions, feature requests, or issue reports, contact kaoxofu@gmail.com.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Saves and restores filter configurations, form states, and URL parameters on web pages upon user request.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename / Location | Notes |
|---|---|---|---|---|
| **Store Icon** [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icons/icon-128.png` | Verified 128×128 RGBA PNG |
| **Screenshot 1** [REQUIRED] | 1280×800 or 640×400 | ⬜ To Capture | Recommended: Main view list with saved views | Shows extension popup displaying saved views with site favicons |
| **Screenshot 2** [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Recommended: Capture & Review screen | Shows selective review of detected query parameters and form controls |
| **Screenshot 3** [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Recommended: Save View naming modal | Shows view naming interface and clear action buttons |
| **Screenshot 4** [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Recommended: Applied restoration status | Shows full/partial restoration badge and feedback overlay |
| **Small Promo Tile** [RECOMMENDED] | 440×280 PNG/JPEG | ⬜ To Create | `store-assets/promo-440x280.png` | Used for Chrome Web Store featured placements |
| **Marquee Promo Tile** [OPTIONAL] | 1400×560 PNG/JPEG | ⬜ To Create | `store-assets/marquee-1400x560.png` | Banner for store spotlight |

### Screenshot Guidance
1. Use real webpages (e.g. GitHub issue filters, e-commerce tables, or data dashboards) with dummy/sample filter values.
2. Ensure clean browser window with no distracting bookmarks or unrelated extensions visible.
3. Export at exactly **1280×800** PNG for crisp rendering on high-DPI displays.

---

## Permissions Justification

*Copy and paste each row into the corresponding justification field in the Chrome Developer Dashboard:*

| Permission | Type | Justification for Chrome Web Store Reviewers |
|---|---|---|
| `storage` | `permissions` | Needed to store user-created views (filter settings and form control states) locally on the device using chrome.storage.local. No data is stored in the cloud. |
| `scripting` | `permissions` | Needed to dynamically scan form controls on the active page when the user opens the popup and apply saved filter values when the user clicks a view. |
| `activeTab` | `permissions` | Needed to access the currently focused tab upon user invocation to inspect page URLs and determine available saved views. |
| `tabs` | `permissions` | Needed to read tab URLs and monitor tab loading status so the extension can automatically navigate to the target URL before restoring a saved view. |
| `favicon` | `permissions` | Needed to fetch and render high-resolution website favicons next to saved views in the popup, allowing users to visually distinguish views across sites. |
| `http://*/*`, `https://*/*` | `optional_host_permissions` | Declared as optional to avoid blanket access on install. Granted on-demand per origin only when the user explicitly saves, updates, or applies a view on that specific website. |

---

## Privacy & Data Use

*Complete the Chrome Web Store Data Use disclosure form as follows:*

### Data Collection Declaration

**Does the extension collect user data?**
Yes (locally for user-saved views; zero off-device transmission by default).

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| **Personally Identifiable Info** | No | No | N/A | No |
| **Health Info** | No | No | N/A | No |
| **Financial / Payment Info** | No | No | N/A (Excluded by safety filter) | No |
| **Authentication Info** | No | No | N/A (Excluded by safety filter) | No |
| **Personal Communications** | No | No | N/A | No |
| **Location** | No | No | N/A | No |
| **Web History** | No | No | N/A | No |
| **User Activity** | No | No | N/A | No |
| **Website Content** | Yes | **No** (Stored 100% locally) | Allows the extension to capture and restore user-selected form values and filter parameters. Data never leaves the browser. | No |

### Data Use Certification
- [x] Data is **NOT** sold to third parties.
- [x] Data is **NOT** used for purposes unrelated to the extension's core functionality.
- [x] Data is **NOT** used for creditworthiness, lending, or advertising.

---

## Privacy Policy

**Privacy Policy Document:** Included in repository at [`docs/PRIVACY.md`](docs/PRIVACY.md).

**Hosting the Privacy Policy for Chrome Web Store:**
Chrome Web Store requires a publicly accessible URL for the privacy policy. You can host `docs/PRIVACY.md` using any of the following:
1. **GitHub Pages:** Enable GitHub Pages on a public repo or documentation branch.
2. **GitHub Gist:** Create a public Gist containing `PRIVACY.md` (e.g. `https://gist.github.com/...`).
3. **Personal Website / Notion / Telegraph:** Paste the contents of `docs/PRIVACY.md` to a public web page.

---

## Distribution

- **Visibility:** Public (or Unlisted if conducting a private beta)
- **Geographic Distribution:** All regions
- **Age Rating / Maturity:** All audiences

---

## Developer & Support Information

- **Publisher Name:** Thien Le
- **Developer Contact Email:** `kaoxofu@gmail.com`
- **Support Email / URL:** `kaoxofu@gmail.com`

---

## Submission Package

Build the clean submission ZIP package anytime using:

```bash
npm run zip
```

This compiles the production extension and packages it cleanly to:
`.output/sticky-site-1.0.0-chrome.zip`

### Package Audit
- **Archive Size:** ~123 KB
- **Manifest Version:** 3 (`manifest_version: 3`)
- **Included Files:**
  - `manifest.json`
  - `popup.html`
  - `background.js` (service worker)
  - `chunks/popup-*.js` (React 19 application)
  - `content-scripts/page-agent.js`
  - `assets/popup-*.css` (Tailwind CSS)
  - `icons/` (16, 32, 48, 128 PNG & SVG)
- **Excluded Files:** Source files, test suites, node_modules, .git, and config files are completely excluded.

---

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| **1.0.0** | 2026-09-10 | Initial production release: local-first view capture, multi-heuristic control matching, selective review screen, and cross-navigation coordinator. | Ready for Submission |
