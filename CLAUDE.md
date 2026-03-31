# CLAUDE.md — Plex Catalog

This file provides context and conventions for AI assistants (e.g., Claude Code) working in this repository.

---

## Project Overview

**Plex Catalog** is a **browser extension** that allows Plex Media Server users to export an index of their media library — movies and TV shows — into common document formats. It connects directly to the user's local Plex server, requires no external infrastructure, and keeps all data on the user's machine.

### Origin
The project began as a local macOS script that read a Plex library and output an Excel spreadsheet. This browser extension is the next iteration: more accessible, cross-platform, and with richer export options.

### Core Use Case
A user installs the extension, points it at their Plex server, selects Movies and/or TV Shows, and exports a formatted catalog in their preferred format.

---

## Product Scope (V1)

### What It Does
- Connects to a local Plex Media Server via `http://localhost:32400` (or user-configured URL + token)
- Reads the user's Movies and TV Shows libraries
- Exports a catalog with the following fields per item:

**Movies:**
- Title
- Director(s) — supports multiple
- Top 4 billed actors

**TV Shows:**
- Series title
- Season and episode number (e.g. S01E09)
- Episode director
- Executive Producer (closest Plex equivalent to showrunner — Plex has no explicit "showrunner" field)
- Top 4 billed actors

### Export Formats
- `.xlsx` — lightly formatted spreadsheet (SheetJS)
- `.docx` — formatted Word document (docx.js)
- `.rtf` — rich text (hand-generated)
- `.txt` — plain text
- `.xml` — structured data
- `.pdf` — formatted document (jsPDF or pdfmake)

### Free Tier / Monetization
- Free: export up to **20 movies** and **5 TV series**
- Paid: **one-time license key** (~$2.99) unlocks unlimited exports
- License key purchased via external payment page (Gumroad, LemonSqueezy, or Stripe)
- Key validated locally in the extension (hash-based or lightweight API call)
- **Do not use Chrome Web Store in-app purchase** — fees make $0.99 unworkable

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Extension platform | Chrome (Manifest V3) — Firefox to follow |
| Language | TypeScript |
| Plex integration | Direct REST calls to Plex HTTP API (`X-Plex-Token` header auth) |
| XLS export | [SheetJS (xlsx)](https://sheetjs.com/) |
| DOCX export | [docx.js](https://docx.js.org/) |
| PDF export | [jsPDF](https://github.com/parallax/jsPDF) or [pdfmake](http://pdfmake.org/) |
| RTF/TXT/XML | Hand-generated strings |
| Build | Vite or webpack (TBD) |
| Tests | Jest + Chrome extension test utilities |
| Linting | ESLint + Prettier |

---

## Directory Structure (Planned)

```
Plex-catalog-/
├── CLAUDE.md                   # This file
├── README.md                   # User-facing documentation
├── manifest.json               # Chrome Extension Manifest V3
├── package.json
├── tsconfig.json
├── vite.config.ts              # or webpack.config.js
├── src/
│   ├── popup/
│   │   ├── popup.html          # Extension popup UI
│   │   ├── popup.ts            # Popup logic
│   │   └── popup.css
│   ├── background/
│   │   └── service-worker.ts   # MV3 background service worker
│   ├── plex/
│   │   ├── client.ts           # Plex API calls (fetch wrapper)
│   │   └── types.ts            # TypeScript types for Plex API responses
│   ├── export/
│   │   ├── xlsx.ts             # XLS export
│   │   ├── docx.ts             # DOCX export
│   │   ├── pdf.ts              # PDF export
│   │   ├── rtf.ts              # RTF export
│   │   ├── txt.ts              # Plain text export
│   │   └── xml.ts              # XML export
│   ├── license/
│   │   └── license.ts          # License key validation + free tier gating
│   └── utils/
│       └── formatting.ts       # Shared formatting helpers
├── tests/
│   ├── plex/
│   │   └── client.test.ts
│   ├── export/
│   │   └── xlsx.test.ts
│   └── license/
│       └── license.test.ts
└── dist/                       # Built extension (gitignored)
```

---

## Development Workflow

### Setting Up

```bash
git clone <repo-url>
cd Plex-catalog-
npm install

# Build the extension
npm run build

# Development build with watch
npm run dev
```

### Loading in Chrome (Development)
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

### Running Tests

```bash
npm test
npm run test:coverage
```

### Linting / Formatting

```bash
npm run lint
npm run format
```

---

## Key Conventions

### Code Style
- TypeScript throughout — no plain `.js` files in `src/`
- ESLint + Prettier for formatting; run before committing
- Types for all Plex API responses in `src/plex/types.ts` — do not use `any`
- Keep export modules independent — each format (`xlsx.ts`, `pdf.ts`, etc.) should be self-contained

### Plex API
- All Plex HTTP calls go through `src/plex/client.ts` — never call `fetch` directly from other modules
- Auth is via `X-Plex-Token` header — **never store the token in plaintext in logs or exports**
- Plex does not have a "showrunner" field — use Executive Producer as the closest equivalent for TV
- Media type IDs: `movie` = 1, `show` = 2, `season` = 3, `episode` = 4
- Actors are returned in billing order — take the first 4
- Do not invent API endpoints — verify against the Plex HTTP API or test against a real server

### Secrets & User Data
- The user's Plex token is stored in `chrome.storage.local` — never `localStorage`, never hardcoded
- No user data is ever sent to any external server (except optional license key validation)
- License key validation should be minimal — a hash check or simple lookup, no telemetry

### Free Tier Gating
- Limit logic lives exclusively in `src/license/license.ts`
- Free tier: 20 movies, 5 TV series per export
- Gate at export time, not at fetch time — always fetch the full library, truncate before export
- Show a clear, non-aggressive upgrade prompt when the limit is hit

### Git Conventions
- Branch naming: `feature/<short-description>`, `fix/<description>`, `chore/<task>`
- Commit messages: imperative mood, present tense (e.g., `Add XLSX export`, `Fix episode director field`)
- Do not commit `dist/`, `node_modules/`, or any file containing a real Plex token

### Testing
- Mock all Plex API calls in unit tests — no real server required
- Test each export format with a small fixture dataset
- Test the free tier cutoff logic explicitly

---

## Plex API Notes

- Base URL is typically `http://localhost:32400` for local servers
- All requests require `X-Plex-Token` header
- List libraries: `GET /library/sections`
- List movies: `GET /library/sections/{sectionId}/all?type=1`
- List shows: `GET /library/sections/{sectionId}/all?type=2`
- List episodes: `GET /library/sections/{sectionId}/all?type=4`
- Director, actors, and producers are in the `Role`, `Director`, and `Producer` sub-elements of each media item
- Plex does not have a native "showrunner" label — `Producer` with `role = "Executive Producer"` is the closest

---

## Licensing & Legal Checklist

This section exists because licensing is commonly overlooked by independent software creators. Review all items before shipping or monetizing.

### Third-Party Library Licenses
Verify every dependency is compatible with commercial distribution. As of the current stack:

| Library | License | Commercial use allowed | Notes |
|---------|---------|----------------------|-------|
| SheetJS (community) | Apache 2.0 | Yes | Free tier only; Pro version has separate license |
| docx.js | MIT | Yes | No restrictions |
| jsPDF | MIT | Yes | No restrictions |
| pdfmake | MIT | Yes | No restrictions |
| TypeScript | Apache 2.0 | Yes | No restrictions |
| Vite | MIT | Yes | No restrictions |
| ESLint | MIT | Yes | No restrictions |

**Rule:** Before adding any new dependency, check its license. Avoid GPL and AGPL libraries — they require your code to also be open-sourced if distributed.

### Output Format Licenses
- `.xlsx` / `.docx` — OOXML open standard (ISO 29500); no Microsoft fees or royalties
- `.pdf` — Open standard (ISO 32000) since 2008; Adobe has no claim over PDF-generating software
- `.rtf` — Microsoft spec, publicly available, never licensed; no fees
- `.txt` / `.xml` — No ownership; no fees

### Plex API Usage
- Review the [Plex Developer Terms of Service](https://www.plex.tv/en-gb/about/privacy-legal/) before shipping
- The Plex API is available for third-party use but verify no commercial restrictions apply
- Do not imply official Plex endorsement in store listings or marketing

### Browser Store Policies
- **Chrome Web Store** — Review [Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/) before submission; policies change
- **Firefox AMO** — Review [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- **Mac App Store** (if pursued) — Review [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- All stores prohibit misleading descriptions, excessive permissions, and hidden functionality

### Privacy & Data Handling
- The extension stores the user's Plex token locally — document this clearly in the store listing and privacy policy
- A **privacy policy is required** by Chrome Web Store and Mac App Store even for free extensions
- State explicitly: no data is collected, no analytics, no external servers (except license validation)
- If license validation calls an external server, document exactly what is sent

### Trademark
- Do not use the Plex name or logo in your extension icon or store listing in a way that implies official affiliation
- Check that "Plex Catalog" or your chosen product name does not conflict with existing trademarks before launch

### General Reminder
**Run through this checklist again before every major version and store submission.** Library licenses, store policies, and API terms can change independently of your code.

---

## Future Considerations

- **Firefox support** — nearly identical codebase, separate manifest entry
- **Safari extension** — requires macOS app wrapper; defer until Chrome/Firefox proven
- **Music libraries** — deliberately excluded from V1; Plex music is a minority use case and Plex's music metadata is unreliable
- **Hosted/SaaS mode** — possible future path using Plex OAuth for remote servers
- **Native macOS app** — possible via Tauri wrapper around the same web frontend

---

## What AI Assistants Should Know

- This is a **browser extension**, not a web app, CLI, or Python script — previous stack assumptions are obsolete
- All processing is **client-side** — no backend server exists or should be added in V1
- The Plex token is sensitive — treat it like a password in all code and comments
- "Showrunner" is not a Plex API field — use Executive Producer and document the limitation
- Keep the free tier gating logic clean and in one place — it's a product decision, not a technical one
- Update this CLAUDE.md whenever scope, stack, or structure changes significantly

### Session Workflow
- **After the user confirms each checklist step is complete, re-display the full project checklist** with that step marked done before proceeding to the next
- Recommended model: **Sonnet 4.6** for most coding phases; switch to **Opus 4.6** for complex architecture decisions (e.g. Plex API design, license key logic)
