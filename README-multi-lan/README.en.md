<div align="center">

# Personal AI Memory

**Your conversations, remembered. Privately.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Back to index](README.md)

</div>

---

> A Chrome extension that **silently captures** your ChatGPT / Claude / Gemini conversations and stores them as private, locally-indexed semantic memories — with a one-click **Recall** button to inject relevant context back into new chats.
>
> **100% local. No cloud. No server. No account required.**


---

## Installation

### For Users — Chrome Web Store

Install directly from the [Chrome Web Store](https://chrome.google.com/webstore/detail/cjkjgbddkaoogdbfffiooeppnmbplpnh).

> **Note:** The Chrome Web Store version may lag behind the latest release. For the newest features, download the latest `.zip` from the [Releases](../../releases) page and load it manually (see below).

### Manual Install from Release

1. Go to the [Releases](../../releases) page and download the latest `.zip`
2. Unzip the file
3. Open Chrome → `chrome://extensions/`
4. Toggle **Developer mode** on (top-right)
5. Click **Load unpacked** → select the unzipped folder

### For Developers — Build from Source

**Requirements:** Node.js 18+, pnpm (`npm install -g pnpm`), Chrome / Edge (MV3)

```bash
git clone <repository-url>
cd AI_Memory
pnpm install

# Development mode — auto-rebuilds on every save
pnpm dev
```

Then load `build/chrome-mv3-dev/` via **Load unpacked** in `chrome://extensions/`.

```bash
# Production build
pnpm build
# output: build/chrome-mv3-prod/
```

> After any code change: click **Reload** on the AI Memory card, then refresh open AI tabs.

---

## Features at a Glance

| Feature | Details |
|---------|---------|
| **Passive capture** | Auto-intercepts ChatGPT / Claude / Gemini — no setup, no clicks |
| **Hybrid search** | Vector (time-decay) + BM25, fused with RRF for best-of-both results |
| **One-click Recall** | Injects relevant memories as a RAG prompt into ChatGPT and Claude |
| **Local backup** | Export / import full backup as JSON (embeddings included) |
| **Favourite Prompts** | Save, autocomplete (Trie), organise into drag-and-drop folders |
| **Floating panel** | Draggable memory panel on every AI site |
| **8 UI languages** | zh-TW · zh-CN · en · ja · ko · es · fr · de — auto-detected |
| **Dark / Light theme** | Apple Liquid Glass-inspired toggle |

**Supported platforms:** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`)

---

# How to Export ChatGPT/Gemini Chat History?

## ChatGPT Chat History Export Steps

1. Log in to your ChatGPT account and go to the main screen.
2. Click your "Profile Picture" or "Name" in the corner to open the menu.
3. Select "Settings".
4. Go to the "Data controls" tab.
5. Find the "Export data" option and click "Export".
6. A confirmation window will pop up; click "Confirm export".
7. You will receive an email containing a download link at your registered email address (Note: It may take up to 24 hours to receive the export email after requesting).
8. Click the link in the email to download the ZIP file. After extracting, the file containing your chat history will be `conversations-00x.json`.


## Gemini Chat History Export Steps

Exporting full data for Gemini is integrated through the Google Takeout service.

1. Log in to your Google account and navigate to the [Google Takeout](https://takeout.google.com) website.
2. Click "Deselect all" at the top of the page to clear all default Google services.
3. Scroll down the list, find and check "My Activity" (Note: Do not select ~~Gemini Apps~~).
4. Click the "Multiple formats" button below that section.
5. In the settings window that appears, change the format of the first activity record from "HTML" to "JSON", and click OK.
6. Scroll to the very bottom of the page and click "Next step".
7. Choose your delivery method (e.g., Send download link via email), keep the default file type and maximum size, then click "Create export".
8. Wait for the system to finish processing and you will receive an email with the download link. After extracting the downloaded file, the exported record file will be `my activity.json`.

---

## How It Works

```
You chat on ChatGPT / Claude / Gemini
        │  (extension captures silently in background)
        ▼
Memories stored locally in IndexedDB
+ semantic embedding vector (ONNX, runs in browser)
+ keyword index (MiniSearch / BM25, in Service Worker memory)
        │
        │  Later — you start a new chat
        ▼
Click 🧠 Recall next to the ChatGPT / Claude input
        │
        ▼
Hybrid search:
  Route A — vector similarity × time-decay (recent = higher weight)
  Route B — BM25 keyword search (prefix matching)
  Fusion  — Reciprocal Rank Fusion (RRF)
        │
        ▼
Top-k memories injected as RAG context into the input box
AI now has your history as background knowledge
```

### Search Algorithm (detail)

The hybrid engine runs two independent routes in parallel, then fuses the ranked lists with RRF:

```
Route A — Vector Search + Time-Decay
  1. Embed the query into a Float32Array via the Offscreen Document (ONNX)
  2. Load all non-deleted records with stored embeddings from IndexedDB
  3. Compute dot product (= cosine similarity for L2-normalised vectors)
  4. Apply time-decay:  decayedScore = baseScore × exp(-0.01 × daysOld)
     Half-life ≈ 69 days (λ = ln(2) / 0.01)
  5. Group by parentId → keep highest decayed score per group
  6. Sort descending → vectorRanked[]

Route B — Keyword Search (MiniSearch / BM25)
  1. Query the in-memory MiniSearch index with { prefix: true }
     "py" finds "python", "react" finds "reactivity"
  2. Results sorted by BM25 relevance score → kwRanked[]

Fusion — Reciprocal Rank Fusion (RRF, k = 60)
  rrfScore[groupKey] += 1 / (60 + rank)   (1-based rank, for each list)
  Sum both lists → sort descending → top-k → merge chunks → SearchResult[]
```

**Why time-decay?** Recent conversations are usually more relevant. Older memories still surface if they rank highly on both routes, but their weight decays naturally over weeks and months.

**Why RRF?** Vector search excels at semantic similarity across languages; keyword search excels at exact term matching (names, code, commands). RRF combines both without normalising scores onto a common scale.

**Fallback:** if embedding fails (model not yet loaded), keyword-only results are returned; if no keyword matches, vector-only results are returned.

**MiniSearch index lifecycle:**

| Event | Action |
|-------|--------|
| Service Worker startup / wake-up | `hydrateSearchIndex()` — full rebuild from Dexie |
| New record saved | `miniSearch.add(chunk)` — incremental sync |
| Bulk import completed | `hydrateSearchIndex()` — rebuild for completeness |

---

## Privacy & Security

This extension intercepts your AI conversations. Here is exactly what it does and does not do:

| Question | Answer |
|----------|--------|
| Where is data stored? | **Browser-local IndexedDB only** (`AIMemoryDB`) — never leaves your device |
| Does it make network requests? | **Only once** — to download the ONNX embedding model on first run. No conversation data is ever uploaded. |
| Can websites see my memories? | No. Data is isolated in the extension's storage, inaccessible to page scripts. |
| Can I delete my data? | Yes — soft-delete individual records from the floating panel, or clear all via DevTools → IndexedDB. |

> **Treat this extension like a local diary.** It sees everything you type and receive on supported AI sites. Review the source code if you have concerns.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Extension framework | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + custom Theme Tokens |
| Persistence | IndexedDB via [Dexie](https://dexie.org) |
| Vector search | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| Keyword search | [MiniSearch](https://github.com/lucaong/minisearch) (BM25, in-memory) |
| Language | TypeScript |

<details>
<summary><strong>📂 Project Structure</strong></summary>

```
src/
├── background/
│   ├── index.ts               Message router · capture handler · MiniSearch sync
│   ├── search.ts              Hybrid search engine (vector × decay + BM25 + RRF)
│   ├── db.ts                  IndexedDB (Dexie) operations
│   ├── embedding.ts           ONNX model name / version constants
│   ├── injector.ts            MAIN-world fetch/XHR interceptor (injected into page)
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1 parser
│       ├── claude.ts          Claude SSE parser
│       └── gemini.ts          Gemini XHR StreamGenerate parser
├── contents/
│   ├── interceptor.ts         ISOLATED-world bridge + <title> MutationObserver
│   ├── memory-float-ui.tsx    Floating panel content script entry point
│   └── chatgpt-injector.tsx   Recall button injection + RAG prompt assembly
├── tabs/
│   └── offscreen.tsx          ONNX inference (Offscreen Document — needs DOM)
├── popup/
│   ├── index.tsx              Popup root — sliding panel navigation
│   └── components/
│       ├── MainMenuView.tsx   Main menu + Favourite Prompts section
│       ├── MemoryTableView.tsx Memory list grouped by session
│       ├── ImportView.tsx     JSON import UI
│       ├── ExportView.tsx     JSON export UI
│       ├── FavoritePromptsSection.tsx Trie autocomplete prompts
│       └── FolderView.tsx     Drag-and-drop folder management
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx Draggable floating panel (logo + panel)
├── i18n/
│   ├── translations.ts        8-language string map
│   ├── LanguageContext.tsx    Language switching (localStorage)
│   └── ThemeContext.tsx       Dark / light theme (localStorage)
└── types/
    ├── memory.ts              MemoryRecord · SearchResult interfaces
    └── messages.ts            All Chrome message type definitions
```

</details>

---

## Debugging & Testing

| Target | How to reach it |
|--------|----------------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | Right-click extension icon → **Inspect popup** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| Manual search test | Service Worker console: `testSearch('keyword', 5)` |

```bash
pnpm test              # Unit tests (Vitest)
pnpm test:integration  # Integration tests
pnpm test:e2e          # E2E tests (Playwright — run pnpm build first)
```


---

## Changelog

### v0.0.2 — 2026-03-01
- **New:** Full Claude web support (`claude.ai`) — conversation capture, Recall button injection, and floating memory panel now work on Claude

### v0.0.1 — Initial Release
- ChatGPT and Gemini conversation capture
- Hybrid vector + BM25 search with RRF fusion
- One-click Recall button (ChatGPT)
- Favourite Prompts with Trie autocomplete and drag-and-drop folders
- Export / import JSON backup
- Floating memory panel
- 8 UI languages, dark / light theme

---

## Contributing

PRs and issues are welcome! Please open an issue to discuss significant changes before submitting a PR.

- Bug reports: [open an issue](../../issues)
- Feature requests: [open an issue](../../issues)

---

## License

[Apache 2.0](LICENSE)
