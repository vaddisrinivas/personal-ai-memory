<div align="center">

# Personal AI Memory: Local-First RAG Extension for LLM

**Your conversations, remembered. Privately.**


[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cjkjgbddkaoogdbfffiooeppnmbplpnh?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/cjkjgbddkaoogdbfffiooeppnmbplpnh)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-supported-74aa9c?logo=openai&logoColor=white)](https://chatgpt.com)
[![Claude](https://img.shields.io/badge/Claude-supported-d97757?logo=anthropic&logoColor=white)](https://claude.ai)
[![Gemini](https://img.shields.io/badge/Gemini-supported-4285F4?logo=google&logoColor=white)](https://gemini.google.com)
[![Perplexity](https://img.shields.io/badge/Perplexity-supported-20808D?logo=perplexity&logoColor=white)](https://perplexity.ai)
[![Grok](https://img.shields.io/badge/Grok-supported-000000?logo=x&logoColor=white)](https://grok.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [繁體中文](README-multi-lan/README.zh-TW.md) | [简体中文](README-multi-lan/README.zh-CN.md) | [English](README-multi-lan/README.en.md) | [日本語](README-multi-lan/README.ja.md) | [한국어](README-multi-lan/README.ko.md) | [Español](README-multi-lan/README.es.md) | [Français](README-multi-lan/README.fr.md) | [Deutsch](README.de.md)

<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>


</div>

---

> A Chrome extension that **silently captures** your ChatGPT / Claude / Gemini / Perplexity / Grok conversations and stores them as private, locally-indexed semantic memories — with a one-click **Recall** button to inject relevant context back into new chats.
>
> **100% local. No cloud. No server. No account required.**


---

## Demo

https://github.com/user-attachments/assets/d2aef66f-30b0-459c-8a92-64b8f5617bf6


## Installation

### For Users — Chrome Web Store

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh).

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
# Fork this repository to your own GitHub account
git clone https://github.com/<your-github-username>/personal-ai-memory.git
cd personal-ai-memory
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
| **Passive capture** | Auto-intercepts ChatGPT / Claude / Gemini / Perplexity / Grok — no setup, no clicks. Just visit the page and existing conversations are captured automatically. |
| **Hybrid search** | Vector (time-decay) + BM25, fused with RRF for best-of-both results |
| **One-click Recall** | Injects relevant memories as a RAG prompt into ChatGPT, Claude, Gemini, Grok, and Perplexity |
| **Local backup** | Export / import full backup as JSON (embeddings included) |
| **Favourite Prompts** | Save, autocomplete (Trie), organise into drag-and-drop folders |
| **Floating panel** | Draggable memory panel on every AI site |
| **8 UI languages** | zh-TW · zh-CN · en · ja · ko · es · fr · de — auto-detected |
| **Dark / Light theme** | Apple Liquid Glass-inspired toggle |

**Supported platforms:** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`) · Perplexity (`perplexity.ai`) · Grok (`grok.com`)

---

## How It Works

```
You chat on ChatGPT / Claude / Gemini / Perplexity / Grok
        │  (extension captures silently in background)
        ▼
Memories stored locally in IndexedDB
+ semantic embedding vector (ONNX, runs in browser)
+ keyword index (MiniSearch / BM25, in Service Worker memory)
        │
        │  Later — you start a new chat
        ▼
Click 🧠 Recall next to the input box on any supported AI site
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

```
Route A — Vector Search + Time-Decay
  query → Float32Array embedding (ONNX, Offscreen Document)
  for each record: dot_product(q, r.embedding) × exp(-0.01 × daysOld)
  group by parentId → keep max decayed score per group
  sort descending → vectorRanked[]
  (half-life ≈ 69 days, λ = 0.01)

Route B — Keyword search (MiniSearch / BM25)
  miniSearch.search(query, { prefix: true })
  prefix matching: "py" finds "python", "react" finds "reactivity"
  sort by BM25 score → kwRanked[]

Fusion — Reciprocal Rank Fusion (RRF, k = 60)
  rrfScore[key] += 1 / (60 + rank)  for each list
  sum both lists → sort desc → top-k → merge chunks → SearchResult[]
```

**Fallback:** if embedding fails, keyword-only results are returned; if no keyword matches, vector-only results are returned.

---

## How to Export Chat History?

### ChatGPT

1. Log in to your ChatGPT account and go to the main screen.
2. Click your profile picture or name in the corner to open the menu.
3. Select **Settings**.
4. Go to the **Data controls** tab.
5. Find **Export data** and click **Export**.
6. Click **Confirm export** in the confirmation window.
7. You will receive an email with a download link (may take up to 24 hours).
8. Download the ZIP file. After extracting, the chat history file is `conversations-00x.json`.

### Gemini

Export via Google Takeout:

1. Go to [Google Takeout](https://takeout.google.com) and sign in.
2. Click **Deselect all** at the top.
3. Scroll down and check **My Activity** (NOT ~~Gemini Apps~~).
4. Click **Multiple formats** below that section.
5. Change the first activity format from **HTML** to **JSON**, click OK.
6. Click **Next step** → choose delivery method → **Create export**.
7. Wait for the email. After extracting, the file is `my activity.json`.

### Claude

1. Go to [https://claude.ai/settings/data-privacy-controls](https://claude.ai/settings/data-privacy-controls).
2. Click **Export data**.
3. Wait for the email with the download link.
4. After extracting, the chat history file is `conversations.json`.

### Perplexity

> Perplexity does **not** support user data export. Each conversation must be visited individually to be captured by the extension.

### Grok

1. Go to [https://grok.com](https://grok.com).
2. Click your profile picture (bottom-left) → **Settings** → **Data controls**.
3. Click **Export Account Data**.
4. Wait several hours for the download link email.
5. After extracting, the file is `prod-grok-backend.json`.

---

## Privacy & Security

This extension intercepts your AI conversations. Here is exactly what it does and does not do:

| Question | Answer |
|----------|--------|
| Where is data stored? | **Browser-local IndexedDB only** (`AIMemoryDB`) — never leaves your device |
| Does it make network requests? | **Conversation data never leaves your device.** Two types of optional network requests occur: (1) ONNX model download on first run; (2) anonymous usage analytics (if enabled) — event names only, no conversation content, no URLs, no personal data. Analytics can be disabled in Settings → Privacy. |
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
│   ├── chunking.ts            Text chunking (500-char segments, 75-char overlap)
│   ├── domSync.ts             DOM-based conversation sync
│   ├── offscreen.ts           Offscreen document message handler
│   ├── perplexityBgFetch.ts   Perplexity background fetch helper
│   ├── syncEmbeddings.ts      Embedding sync utilities
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1 parser
│       ├── claude.ts          Claude SSE parser
│       ├── gemini.ts          Gemini XHR StreamGenerate parser + passive capture
│       ├── perplexity.ts      Perplexity SSE parser
│       └── grok.ts            Grok SSE parser
├── contents/
│   ├── interceptor.ts         ISOLATED-world bridge + <title> MutationObserver
│   ├── memory-float-ui.tsx    Floating panel content script entry point
│   ├── chatgpt-injector.tsx   ChatGPT Recall button + RAG prompt
│   ├── claude-injector.tsx    Claude Recall button
│   ├── gemini-injector.tsx    Gemini passive capture + Recall button
│   ├── grok-injector.tsx      Grok Recall button
│   └── perplexity-injector.tsx Perplexity Recall button
├── importers/
│   ├── base.ts                Base importer interface
│   ├── chatgptConversations.ts ChatGPT JSON importer
│   ├── claudeConversations.ts  Claude JSON importer
│   ├── geminiTakeout.ts       Gemini Takeout importer
│   ├── grokConversations.ts   Grok JSON importer
│   └── index.ts               Importer registry
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
├── utils/
│   ├── chrome-storage.ts      Shared chrome.storage.local helpers (load/save/subscribe)
│   ├── rag.ts                 RAG prompt formatting
│   ├── recall-button.ts       Recall button creation and injection
│   ├── recall-helpers.ts      Shared recall utilities
│   ├── trie.ts                Trie data structure for autocomplete
│   ├── message-passing.ts     Type-safe Chrome message passing
│   └── onboarding-highlight.ts Onboarding step highlight helpers
├── i18n/
│   ├── translations.ts        8-language string map
│   ├── LanguageContext.tsx    Language switching (chrome.storage — syncs across tabs)
│   ├── ThemeContext.tsx       Dark/light theme (chrome.storage — syncs across tabs)
│   └── lang-storage.ts        Language persistence helpers
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

### v0.0.6 — 2026-03-15
- **Fix:** Theme changes now sync instantly across all open tabs — previously only the current tab updated when toggling dark/light mode
- **Fix:** Language changes now sync instantly across all open tabs — previously required a page reload to take effect
- **Fix:** Floating panel state (open/closed, active view) now persists across page reloads and site navigation — previously reset to the floating button on every page load
- **Refactor:** Moved importers from `src/popup/components/importers/` → `src/importers/` for cleaner separation
- **Refactor:** Extracted shared `chrome.storage` utilities (`loadFromChrome`, `saveToChrome`, `subscribeChromeStorage`) into `src/utils/chrome-storage.ts` — used by both theme and language contexts
- **Refactor:** Extracted background processing into dedicated modules: `chunking.ts`, `domSync.ts`, `offscreen.ts`, `perplexityBgFetch.ts`
- **Refactor:** Extracted RAG prompt formatting and recall logic into `src/utils/rag.ts`, `src/utils/recall-button.ts`, `src/utils/recall-helpers.ts`

### v0.0.5 — 2026-03-12
- **Fix:** Gemini passive capture now uses updated DOM selectors (`<user-query>` / `<message-content>`) matching the current Gemini UI — conversations were silently missed after a Gemini front-end update.
- **Fix:** Gemini duplicate-capture eliminated — stable deterministic record IDs and XHR debounce (1 s) prevent the same conversation from being stored again on page reload or mid-stream.
- **Fix:** Recall button now shows a clear alert when the input is empty or memories have already been injected — prevents accidental double-injection on all platforms (ChatGPT, Claude, Gemini, Grok, Perplexity).
- **Fix:** Recall-injected `[System Context]` template is stripped before saving — only the real user query is stored in memory.
- **Fix:** Perplexity Recall button now appears immediately after the "Choose a model" button (correct position).
- **Fix:** Gemini conversation title now reads from the sidebar item instead of `document.title` for more accurate session names.
- **Fix:** Gemini text injection rewritten for more reliable input handling.
- **Fix:** Grok input detection improved — no more false "empty input" errors.
- **Fix:** Memory list deduplication improved for Gemini and ChatGPT sessions.
- **Improvement:** Recall button alerts now follow the extension's display language.

### v0.0.4 — 2026-03-06
- **New:** Grok (`grok.com`) support — conversations are silently captured while you browse.
- **New:** Gemini passive message capture — existing conversations on the page are automatically captured when you visit.

### v0.0.3 — 2026-03-02
- Perplexity (`perplexity.ai`) support — conversations are silently captured while you browse. Note: Perplexity itself does not support user data export, so each conversation must be visited individually to be collected.

### v0.0.2 — 2026-03-01
- Full Claude web support (`claude.ai`) — conversation capture, Recall button injection, and floating memory panel now work on Claude

### v0.0.1 — Initial Release 2026-02-24
- ChatGPT and Gemini conversation capture
- Hybrid vector + BM25 search with RRF fusion
- One-click Recall button (ChatGPT, Gemini)
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
