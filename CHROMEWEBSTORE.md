# Chrome Web Store Listing — StickySite

> Last Updated: 2026-09-11

---

## Store Listing

**Extension Name** [REQUIRED]
StickySite

**Short Description** [REQUIRED]
Save and restore search filters, form inputs, and custom page views on any website in one click. Fast, private, and local-first.

*(Length: 122 characters / max 132)*

**Detailed Description** [REQUIRED]

Save and restore your favorite search filters, form selections, and custom page views on any website in a single click.

Tired of resetting the same filters, dropdowns, and search terms every time you open a dashboard, web app, or online store? Traditional browser bookmarks only save URLs—they lose interactive form controls, date range pickers, dropdown selections, and checkbox filters.

StickySite acts as your personal filter preset manager, saving your exact webpage configurations and form states locally so you can return to them instantly.


KEY FEATURES

• One-Click Filter & View Restoration — Reapply your saved search parameters, dropdown selections, text inputs, radio buttons, and checkboxes instantly.

• Selective Capture Review — Inspect every detected filter and form control before saving. Easily exclude individual parameters with a single toggle.

• Multi-View Management — Save multiple named view presets per website (e.g., "Q3 Open Bugs", "In-Stock Laptops Under $1000", "Weekly Analytics Report").

• Automatic Cross-Page Navigation — Clicking a saved view takes you directly to the correct URL and automatically restores all form settings upon page load.

• Transparent Status Feedback — Real-time visual feedback confirms which settings were applied, partial matches, or if a webpage updated its layout.

• Quick Updates & Renaming — Update existing views with current page settings in one click, rename them, or delete them when no longer needed.


POPULAR USE CASES

• Analytics & Dashboards: Save complex date ranges, metric filters, breakdown segments, and display toggles across reporting dashboards.

• Project Management & Issue Trackers: Remember custom sprint filters, assignee dropdowns, status criteria, and milestone queries on agile boards.

• E-Commerce & Shopping: Keep your favorite size, price range, in-stock toggles, and sorting preferences saved across retail web stores.

• CRM & Sales Tools: Reapply lead filters, pipeline stages, custom account views, and team selections in back-office web portals.

• Real Estate & Job Boards: Retain advanced search parameters, location radii, experience criteria, and salary filters without retyping.


HOW TO USE

1. Open any webpage and set up your filters, search terms, and dropdowns.

2. Click the StickySite icon in your Chrome toolbar > Allow requested permission > Click Save Current View.

3. Name your view and click 'Save View' (or open the review screen to customize captured fields).

4. Return to the site anytime, open StickySite, and click your saved view to restore everything in one click.


PRIVACY & SECURITY FIRST

• Local-First by Default: All saved views and presets reside strictly on your device in local storage. No account is required to use StickySite today. If cloud sync is introduced in a future update, it will be strictly opt-in with explicit user consent.

• Proactive Safety Filtering: StickySite automatically detects and ignores sensitive fields. Passwords, credit cards, bank account details, SSNs, phone numbers, and security tokens are NEVER captured or saved.

• No Destructive Actions: StickySite only populates form inputs and filters. It never triggers 'Submit', 'Pay', 'Buy', 'Delete', or confirmation buttons.

• Least-Privilege Permissions: No blanket browsing permissions upon install. Origin access is requested only when you actively choose to use StickySite on a website.


PERMISSIONS EXPLAINED

• Storage: Saves your filter presets locally in your browser.

• ActiveTab & Scripting: Scans form controls and restores saved values on the current page when you click a view.

• Tabs: Navigates to the correct webpage URL before applying a saved view.

• Favicon: Displays website icons next to saved views for easy visual identification.


SUPPORT & FEEDBACK

Found a bug, have a suggestion, or need help? Contact us at kaoxofu@gmail.com.

Version 1.0.0 — Initial production release.

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
| **Screenshot 1** [REQUIRED] | 1280×800 | ✅ Ready | `store-assets/screenshot-1-saved-views.png` | Main saved-view list on a sample inventory page |
| **Screenshot 2** [RECOMMENDED] | 1280×800 | ✅ Ready | `store-assets/screenshot-2-capture-review.png` | Selective review of detected query parameters and form controls |
| **Screenshot 3** [RECOMMENDED] | 1280×800 | ✅ Ready | `store-assets/screenshot-3-name-view.png` | View naming interface with dummy data |
| **Screenshot 4** [RECOMMENDED] | 1280×800 | ✅ Ready | `store-assets/screenshot-4-restoration-status.png` | Successful six-setting restoration feedback |
| **Small Promo Tile** [REQUIRED] | 440×280 PNG | ✅ Ready | `store-assets/promo-440x280.png` | Full-bleed brand tile for listings and discovery surfaces |
| **Marquee Promo Tile** [OPTIONAL] | 1400×560 PNG | ✅ Ready | `store-assets/marquee-1400x560.png` | Full-bleed brand banner for possible marquee placement |

### Screenshot Guidance
1. Use real webpages (e.g. GitHub issue filters, e-commerce tables, or data dashboards) with dummy/sample filter values.
2. Ensure clean browser window with no distracting bookmarks or unrelated extensions visible.
3. Export at exactly **1280×800** PNG for crisp rendering on high-DPI displays.

Regenerate the listing screenshots from the production build with `npm run screenshots:store`.
The same command regenerates both promotional images.

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
| **Website Content** | Yes | **No** (Stored locally on-device) | Allows the extension to capture and restore user-selected form values and filter parameters. Data stays in the browser; any future cloud sync will require explicit user opt-in. | No |

### Remote Code Declaration

**Are you using remote code?**
**No, I am not using remote code.**
- All JavaScript, HTML, and CSS are bundled locally inside the extension package.
- The extension does not execute remotely hosted code, load external CDN scripts at runtime, or use `eval()`.

### Data Use Certification
- [x] Data is **NOT** sold to third parties.
- [x] Data is **NOT** used for purposes unrelated to the extension's core functionality.
- [x] Data is **NOT** used for creditworthiness, lending, or advertising.

---

## Privacy Policy

**Privacy Policy Document:** Included in repository at [`PRIVACY.md`](PRIVACY.md).

**Hosting the Privacy Policy for Chrome Web Store:**
Chrome Web Store requires a publicly accessible URL for the privacy policy. You can host `PRIVACY.md` using any of the following:
1. **GitHub Pages:** Enable GitHub Pages on a public repo or documentation branch (e.g., `sticky-site-feedback`).
2. **GitHub Gist:** Create a public Gist containing `PRIVACY.md` (e.g. `https://gist.github.com/...`).
3. **Personal Website / Notion / Telegraph:** Paste the contents of `PRIVACY.md` to a public web page.

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
| **1.0.0** | 2026-09-11 | Listing revision: removed third-party brand names from description to comply with keyword spam policy (Yellow Argon). | Ready for Resubmission |
| **1.0.0** | 2026-09-10 | Initial production release: local-first view capture, multi-heuristic control matching, selective review screen, and cross-navigation coordinator. | Rejected (Keyword Spam) |
