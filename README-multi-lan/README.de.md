<div align="center">

# Personal AI Memory

**Deine Gespräche, privat gespeichert.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cjkjgbddkaoogdbfffiooeppnmbplpnh?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-supported-74aa9c?logo=openai&logoColor=white)](https://chatgpt.com)
[![Claude](https://img.shields.io/badge/Claude-supported-d97757?logo=anthropic&logoColor=white)](https://claude.ai)
[![Gemini](https://img.shields.io/badge/Gemini-supported-4285F4?logo=google&logoColor=white)](https://gemini.google.com)
[![Perplexity](https://img.shields.io/badge/Perplexity-supported-20808D?logo=perplexity&logoColor=white)](https://perplexity.ai)
[![Grok](https://img.shields.io/badge/Grok-supported-000000?logo=x&logoColor=white)](https://grok.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README-multi-lan/README.zh-TW.md) | [简体中文](README-multi-lan/README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README-multi-lan/README.ko.md) | [Español](README-multi-lan/README.es.md) | [Français](README-multi-lan/README.fr.md) | [Zur Startseite](README.md)


<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>
🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Zur Startseite](../README.md)

</div>

---

> Eine Chrome-Erweiterung, die deine ChatGPT / Claude / Gemini / Perplexity / Grok-Gespräche **still im Hintergrund erfasst** und als private, lokal indexierte semantische Erinnerungen speichert — mit einem **Recall**-Button, der relevante Kontexte per Klick in neue Chats injiziert.
>
> **100% lokal. Keine Cloud. Kein Server. Kein Account erforderlich.**


---

## Installation

### Für Benutzer — Chrome Web Store

Direkt im [Chrome Web Store](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh) installieren.

> **Hinweis:** Die Chrome Web Store-Version kann hinter der neuesten Version zurückliegen. Für die neuesten Funktionen lade das aktuelle `.zip` von der [Releases](../../releases)-Seite herunter und lade es manuell (Schritte unten).

### Manuell aus einem Release installieren

1. Gehe zur [Releases](../../releases)-Seite und lade das neueste `.zip` herunter
2. Entpacke die Datei
3. Öffne Chrome → `chrome://extensions/`
4. Aktiviere den **Entwicklermodus** (oben rechts)
5. Klicke auf **Entpackte Erweiterung laden** → wähle den entpackten Ordner

### Für Entwickler — Aus dem Quellcode bauen

**Voraussetzungen:** Node.js 18+, pnpm (`npm install -g pnpm`), Chrome / Edge (MV3)

```bash
# Forke dieses Repository in dein eigenes GitHub-Konto
git clone https://github.com/<your-github-username>/personal-ai-memory.git
cd AI_Memory
pnpm install

# Entwicklungsmodus — baut automatisch bei jeder Speicherung neu
pnpm dev
```

Lade dann `build/chrome-mv3-dev/` über **Entpackte Erweiterung laden** in `chrome://extensions/`.

```bash
# Produktions-Build
pnpm build
# Ausgabe: build/chrome-mv3-prod/
```

> Nach jeder Code-Änderung: Klicke auf **Neu laden** auf der AI Memory-Karte, dann offene KI-Tabs aktualisieren (F5).

---

## Funktionen auf einen Blick

| Funktion | Details |
|----------|---------|
| **Passive Erfassung** | Fängt ChatGPT / Claude / Gemini / Perplexity / Grok automatisch ab — kein Setup, keine Klicks. Besuche einfach die Seite und bestehende Gespräche werden automatisch erfasst. |
| **Hybridsuche** | Vektor (Zeitabfall) + BM25, mit RRF für optimale Ergebnisse fusioniert |
| **Recall per Klick** | Injiziert relevante Erinnerungen als RAG-Prompt auf allen unterstützten Plattformen |
| **Lokales Backup** | Exportiere / importiere vollständiges Backup als JSON (Embeddings enthalten) |
| **Lieblingsaufforderungen** | Speichern, Autovervollständigung (Trie), in Drag-&-Drop-Ordner organisieren |
| **Schwebendes Panel** | Verschiebbares Speicherpanel auf jeder KI-Seite |
| **8 UI-Sprachen** | zh-TW · zh-CN · en · ja · ko · es · fr · de — automatisch erkannt |
| **Dunkel- / Hellmodus** | Apple Liquid Glass-inspirierter Umschalter |

**Unterstützte Plattformen:** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`) · Perplexity (`perplexity.ai`) · Grok (`grok.com`)

---

## Wie exportiert man den Chatverlauf?

### ChatGPT

1. Melde dich bei deinem ChatGPT-Konto an und gehe zum Hauptbildschirm.
2. Klicke in der Ecke auf dein "Profilbild" oder deinen "Namen", um das Menü zu öffnen.
3. Wähle **Settings** (Einstellungen).
4. Gehe zur Registerkarte **Data controls** (Datenkontrolle).
5. Suche **Export data** und klicke auf **Export**.
6. Klicke im Bestätigungsfenster auf **Confirm export**.
7. Du erhältst eine E-Mail mit einem Download-Link (kann bis zu 24 Stunden dauern).
8. Lade die ZIP-Datei herunter. Nach dem Entpacken lautet die Datei mit deinem Chatverlauf `conversations-00x.json`.

### Gemini

Export über Google Takeout:

1. Gehe zu [Google Takeout](https://takeout.google.com) und melde dich an.
2. Klicke oben auf **Auswahl aufheben**.
3. Scrolle nach unten und markiere **Meine Aktivitäten** (My Activity) (NICHT ~~Gemini Apps~~).
4. Klicke auf die Schaltfläche **Mehrere Formate**.
5. Ändere das Format des ersten Aktivitätseintrags von **HTML** zu **JSON**, klicke auf OK.
6. Klicke auf **Nächster Schritt** → Übermittlungsmethode wählen → **Export erstellen**.
7. Warte auf die E-Mail. Nach dem Entpacken ist die exportierte Datei `my activity.json`.

### Claude

1. Gehe zu [https://claude.ai/settings/data-privacy-controls](https://claude.ai/settings/data-privacy-controls).
2. Klicke auf **Export data**.
3. Warte auf die E-Mail mit dem Download-Link.
4. Nach dem Entpacken lautet die Datei mit dem Chatverlauf `conversations.json`.

### Perplexity

> Perplexity unterstützt **keinen** Datenenexport. Jedes Gespräch muss einzeln geöffnet werden, damit die Erweiterung es erfassen kann.

### Grok

1. Gehe zu [https://grok.com](https://grok.com).
2. Klicke auf dein Profilbild (unten links) → **Settings** → **Data controls**.
3. Klicke auf **Export Account Data**.
4. Warte einige Stunden auf die E-Mail mit dem Download-Link.
5. Nach dem Entpacken ist die Datei `prod-grok-backend.json`.

---

## So funktioniert es

```
Du chattest auf ChatGPT / Claude / Gemini / Perplexity / Grok
        │  (Erweiterung erfasst still im Hintergrund)
        ▼
Erinnerungen lokal in IndexedDB gespeichert
+ semantischer Embedding-Vektor (ONNX, läuft im Browser)
+ Stichwort-Index (MiniSearch / BM25, im Service Worker-Speicher)
        │
        │  Später — du startest einen neuen Chat
        ▼
Klick auf 🧠 Recall neben dem Eingabefeld auf einer beliebigen unterstützten Plattform
        │
        ▼
Hybridsuche:
  Route A — Vektorähnlichkeit × Zeitabfall (aktuell = höheres Gewicht)
  Route B — BM25-Stichwortsuche (Präfix-Matching)
  Fusion  — Reciprocal Rank Fusion (RRF)
        │
        ▼
Top-k Erinnerungen als RAG-Kontext ins Eingabefeld injiziert
KI verfügt jetzt über deine Gesprächsgeschichte als Hintergrundwissen
```

### Suchalgorithmus (Detail)

```
Route A — Vektorsuche + Zeitabfall
  Anfrage → Float32Array-Embedding (ONNX, Offscreen Document)
  für jeden Eintrag: dot_product(q, r.embedding) × exp(-0.01 × tageAlt)
  nach parentId gruppieren → maximalen Abfallwert pro Gruppe behalten
  absteigend sortieren → vectorRanked[]
  (Halbwertszeit ≈ 69 Tage, λ = 0.01)

Route B — Stichwortsuche (MiniSearch / BM25)
  miniSearch.search(query, { prefix: true })
  Präfix-Matching: "py" findet "python", "react" findet "reactivity"
  nach BM25-Score sortieren → kwRanked[]

Fusion — Reciprocal Rank Fusion (RRF, k = 60)
  rrfScore[key] += 1 / (60 + Rang)  für jede Liste
  beide Listen summieren → absteigend sortieren → top-k → Chunks zusammenführen → SearchResult[]
```

**Fallback:** wenn Embedding fehlschlägt, werden nur Stichwort-Ergebnisse zurückgegeben; bei keinen Stichwort-Treffern nur Vektor-Ergebnisse.

---

## Datenschutz und Sicherheit

Diese Erweiterung fängt deine KI-Gespräche ab. Hier ist genau, was sie tut und nicht tut:

| Frage | Antwort |
|-------|---------|
| Wo werden Daten gespeichert? | **Nur im lokalen IndexedDB des Browsers** (`AIMemoryDB`) — verlässt niemals dein Gerät |
| Sendet sie Netzwerkanfragen? | **Nur einmal** — um das ONNX-Embedding-Modell beim ersten Start herunterzuladen. Gesprächsdaten werden niemals hochgeladen. |
| Können Webseiten meine Erinnerungen sehen? | Nein. Daten sind im Erweiterungsspeicher isoliert, für Seitenscripts unzugänglich. |
| Kann ich meine Daten löschen? | Ja — Soft-Löschen einzelner Einträge aus dem schwebenden Panel, oder vollständiges Löschen über DevTools → IndexedDB. |

> **Behandle diese Erweiterung wie ein lokales Tagebuch.** Sie sieht alles, was du auf unterstützten KI-Seiten eingibst und erhältst. Überprüfe den Quellcode, wenn du Bedenken hast.

---

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Erweiterungs-Framework | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + benutzerdefinierte Theme-Token |
| Persistenz | IndexedDB via [Dexie](https://dexie.org) |
| Vektorsuche | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| Stichwortsuche | [MiniSearch](https://github.com/lucaong/minisearch) (BM25, im Speicher) |
| Sprache | TypeScript |

<details>
<summary><strong>📂 Projektstruktur</strong></summary>

```
src/
├── background/
│   ├── index.ts               Nachrichten-Router · Erfassungshandler · MiniSearch-Sync
│   ├── search.ts              Hybrid-Suchmaschine (Vektor×Abfall + BM25 + RRF)
│   ├── db.ts                  IndexedDB (Dexie)-Operationen
│   ├── embedding.ts           ONNX-Modellname / -Versionskonstanten
│   ├── injector.ts            MAIN-world fetch/XHR-Interceptor (in Seite injiziert)
│   ├── chunking.ts            Text-Chunking (500-Zeichen-Segmente, 75-Zeichen-Überlappung)
│   ├── domSync.ts             DOM-basierte Konversationssynchronisation
│   ├── offscreen.ts           Offscreen-Document-Nachrichtenhandler
│   ├── perplexityBgFetch.ts   Perplexity-Hintergrund-Fetch-Helfer
│   ├── syncEmbeddings.ts      Embedding-Sync-Utilities
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1-Parser
│       ├── claude.ts          Claude SSE-Parser
│       ├── gemini.ts          Gemini XHR StreamGenerate-Parser + passive Erfassung
│       ├── perplexity.ts      Perplexity SSE-Parser
│       └── grok.ts            Grok SSE-Parser
├── contents/
│   ├── interceptor.ts         ISOLATED-world-Brücke + <title> MutationObserver
│   ├── memory-float-ui.tsx    Content-Script-Einstiegspunkt des schwebenden Panels
│   ├── chatgpt-injector.tsx   ChatGPT Recall-Button + RAG-Prompt
│   ├── claude-injector.tsx    Claude Recall-Button
│   ├── gemini-injector.tsx    Gemini passive Erfassung + Recall-Button
│   ├── grok-injector.tsx      Grok Recall-Button
│   └── perplexity-injector.tsx Perplexity Recall-Button
├── importers/
│   ├── base.ts                Basis-Importer-Interface
│   ├── chatgptConversations.ts ChatGPT-JSON-Importer
│   ├── claudeConversations.ts  Claude-JSON-Importer
│   ├── geminiTakeout.ts       Gemini-Takeout-Importer
│   ├── grokConversations.ts   Grok-JSON-Importer
│   └── index.ts               Importer-Registry
├── tabs/
│   └── offscreen.tsx          ONNX-Inferenz (Offscreen Document — benötigt DOM)
├── popup/
│   ├── index.tsx              Popup-Wurzel — Schiebepanel-Navigation
│   └── components/
│       ├── FloatingMemoryPanel.tsx Verschiebbares schwebendes Panel (Logo + Panel)
│       ├── MemoryMenuContent.tsx   Speichermenü-Inhalt (Seitenleiste / Popup)
│       ├── MemoryTableView.tsx Nach Session gruppierte Erinnerungsliste
│       ├── ImportView.tsx     JSON-Import-UI
│       ├── ExportView.tsx     JSON-Export-UI
│       ├── FavoritePromptsSection.tsx Trie-Autovervollständigungs-Prompts
│       └── FolderView.tsx     Drag-&-Drop-Ordnerverwaltung
├── utils/
│   ├── chrome-storage.ts      Gemeinsame chrome.storage.local-Helfer (Laden/Speichern/Abonnieren)
│   ├── rag.ts                 RAG-Prompt-Formatierung
│   ├── recall-button.ts       Recall-Button-Erstellung und -Injektion
│   ├── recall-helpers.ts      Gemeinsame Recall-Utilities
│   ├── trie.ts                Trie-Datenstruktur für Autovervollständigung
│   ├── message-passing.ts     Typsichere Chrome-Nachrichtenübergabe
│   └── onboarding-highlight.ts Onboarding-Schritt-Highlight-Helfer
├── i18n/
│   ├── translations.ts        8-Sprachen-Zeichenkettenkarte
│   ├── LanguageContext.tsx    Sprachwechsel (chrome.storage — Tab-übergreifend synchron)
│   ├── ThemeContext.tsx       Dunkel- / Hellmodus (chrome.storage — Tab-übergreifend synchron)
│   └── lang-storage.ts        Sprach-Persistenz-Helfer
└── types/
    ├── memory.ts              MemoryRecord · SearchResult-Schnittstellen
    └── messages.ts            Alle Chrome-Nachrichtentyp-Definitionen
```

</details>

---

## Debugging und Tests

| Ziel | Zugang |
|------|--------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | Rechtsklick auf das Erweiterungs-Icon → **Popup untersuchen** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| Manueller Suchtest | Service Worker-Konsole: `testSearch('Stichwort', 5)` |

```bash
pnpm test              # Unit-Tests (Vitest)
pnpm test:integration  # Integrationstests
pnpm test:e2e          # E2E-Tests (Playwright — erst pnpm build ausführen)
```

---

## Änderungsprotokoll

Siehe [CHANGELOG.md](../CHANGELOG.md) für die vollständige Versionsgeschichte.


---

## Beiträge und Lizenz

PRs und Issues sind willkommen! Bitte öffne ein Issue, um größere Änderungen zu besprechen, bevor du einen PR einreichst.

- Bugs melden: [Issue öffnen](../../issues)
- Funktionsanfragen: [Issue öffnen](../../issues)

---

## License

[Apache 2.0](LICENSE)
