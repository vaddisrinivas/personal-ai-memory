<div align="center">

# Personal AI Memory

**Deine Gespräche, privat gespeichert.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README-multi-lan/README.zh-TW.md) | [简体中文](README-multi-lan/README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README-multi-lan/README.ko.md) | [Español](README-multi-lan/README.es.md) | [Français](README-multi-lan/README.fr.md) | [Zur Startseite](README.md)

</div>

---

> Eine Chrome-Erweiterung, die deine ChatGPT / Claude / Gemini-Gespräche **still im Hintergrund erfasst** und als private, lokal indexierte semantische Erinnerungen speichert — mit einem **Recall**-Button, der relevante Kontexte per Klick in neue Chats injiziert.
>
> **100% lokal. Keine Cloud. Kein Server. Kein Account erforderlich.**


---

## Installation

### Für Benutzer — Chrome Web Store

Direkt im [Chrome Web Store](https://chrome.google.com/webstore/detail/cjkjgbddkaoogdbfffiooeppnmbplpnh) installieren.

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
git clone <repository-url>
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
| **Passive Erfassung** | Fängt ChatGPT / Claude / Gemini automatisch ab — kein Setup, keine Klicks |
| **Hybridsuche** | Vektor (Zeitabfall) + BM25, mit RRF für optimale Ergebnisse fusioniert |
| **Recall per Klick** | Injiziert relevante Erinnerungen als RAG-Prompt in ChatGPT und Claude |
| **Lokales Backup** | Exportiere / importiere vollständiges Backup als JSON (Embeddings enthalten) |
| **Lieblingsaufforderungen** | Speichern, Autovervollständigung (Trie), in Drag-&-Drop-Ordner organisieren |
| **Schwebendes Panel** | Verschiebbares Speicherpanel auf jeder KI-Seite |
| **8 UI-Sprachen** | zh-TW · zh-CN · en · ja · ko · es · fr · de — automatisch erkannt |
| **Dunkel- / Hellmodus** | Apple Liquid Glass-inspirierter Umschalter |

**Unterstützte Plattformen:** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`)

---

# Wie exportiert man den ChatGPT/Gemini-Chatverlauf?

## Schritte zum Exportieren des ChatGPT-Chatverlaufs

1. Melden Sie sich bei Ihrem ChatGPT-Konto an und gehen Sie zum Hauptbildschirm.
2. Klicken Sie in der Ecke auf Ihr "Profilbild" oder Ihren "Namen", um das Menü zu öffnen.
3. Wählen Sie "Settings" (Einstellungen).
4. Gehen Sie zur Registerkarte "Data controls" (Datenkontrolle).
5. Suchen Sie die Option "Export data" (Daten exportieren) und klicken Sie auf "Export" (Exportieren).
6. Ein Bestätigungsfenster wird angezeigt; klicken Sie auf "Confirm export" (Export bestätigen).
7. Sie erhalten eine E-Mail mit einem Download-Link an Ihre registrierte E-Mail-Adresse (Hinweis: Es kann bis zu 24 Stunden dauern, bis Sie die Export-E-Mail nach der Anfrage erhalten).
8. Klicken Sie auf den Link in der E-Mail, um die ZIP-Datei herunterzuladen. Nach dem Entpacken lautet die Datei mit Ihrem Chatverlauf `conversations-00x.json`.

## Schritte zum Exportieren des Gemini-Chatverlaufs

Der vollständige Datenexport für Gemini ist über den Google Takeout-Dienst integriert.

1. Melden Sie sich bei Ihrem Google-Konto an und navigieren Sie zur [Google Takeout](https://takeout.google.com) Website.
2. Klicken Sie oben auf der Seite auf "Auswahl aufheben", um alle standardmäßigen Google-Dienste abzuwählen.
3. Scrollen Sie in der Liste nach unten, suchen und markieren Sie "Meine Aktivitäten" (My Activity) (Hinweis: Wählen Sie nicht ~~Gemini Apps~~ aus).
4. Klicken Sie unter diesem Abschnitt auf die Schaltfläche "Mehrere Formate".
5. Ändern Sie im angezeigten Einstellungsfenster das Format des ersten Aktivitätseintrags von "HTML" zu "JSON" und klicken Sie auf OK.
6. Scrollen Sie ganz nach unten auf der Seite und klicken Sie auf "Nächster Schritt".
7. Wählen Sie Ihre Übermittlungsmethode (z. B. Download-Link per E-Mail senden), behalten Sie den Standarddateityp und die maximale Größe bei und klicken Sie auf "Export erstellen".
8. Warten Sie, bis das System die Verarbeitung abgeschlossen hat. Sie erhalten eine E-Mail mit dem Download-Link. Nach dem Entpacken ist die exportierte Datei `my activity.json`.

---

## So funktioniert es

```
Du chattest auf ChatGPT / Claude / Gemini
        │  (Erweiterung erfasst still im Hintergrund)
        ▼
Erinnerungen lokal in IndexedDB gespeichert
+ semantischer Embedding-Vektor (ONNX, läuft im Browser)
+ Stichwort-Index (MiniSearch / BM25, im Service Worker-Speicher)
        │
        │  Später — du startest einen neuen Chat
        ▼
Klick auf 🧠 Recall neben dem ChatGPT / Claude-Eingabefeld
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
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1-Parser
│       ├── claude.ts          Claude SSE-Parser
│       └── gemini.ts          Gemini XHR StreamGenerate-Parser
├── contents/
│   ├── interceptor.ts         ISOLATED-world-Brücke + <title> MutationObserver
│   ├── memory-float-ui.tsx    Content-Script-Einstiegspunkt des schwebenden Panels
│   └── chatgpt-injector.tsx   Recall-Button-Injektion + RAG-Prompt-Zusammenbau
├── tabs/
│   └── offscreen.tsx          ONNX-Inferenz (Offscreen Document — benötigt DOM)
├── popup/
│   ├── index.tsx              Popup-Wurzel — Schiebepanel-Navigation
│   └── components/
│       ├── MainMenuView.tsx   Hauptmenü + Lieblingsaufforderungen-Abschnitt
│       ├── MemoryTableView.tsx Nach Session gruppierte Erinnerungsliste
│       ├── ImportView.tsx     JSON-Import-UI
│       ├── ExportView.tsx     JSON-Export-UI
│       ├── FavoritePromptsSection.tsx Trie-Autovervollständigungs-Prompts
│       └── FolderView.tsx     Drag-&-Drop-Ordnerverwaltung
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx Verschiebbares schwebendes Panel (Logo + Panel)
├── i18n/
│   ├── translations.ts        8-Sprachen-Zeichenkettenkarte
│   ├── LanguageContext.tsx    Sprachwechsel (localStorage)
│   └── ThemeContext.tsx       Dunkel- / Hellmodus (localStorage)
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

### v0.0.2 — 2026-03-01
- **Neu:** Vollständige Unterstützung für Claude Web (`claude.ai`) — Gesprächserfassung, Recall-Button-Injektion und schwebendes Speicherpanel funktionieren jetzt auf Claude

### v0.0.1 — Erstveröffentlichung
- ChatGPT- und Gemini-Gesprächserfassung
- Hybridsuche Vektor + BM25 mit RRF-Fusion
- Recall-Button per Klick (ChatGPT)
- Lieblingsaufforderungen mit Trie-Autovervollständigung und Drag-&-Drop-Ordnern
- JSON-Backup Export / Import
- Schwebendes Speicherpanel
- 8 UI-Sprachen, Dunkel- / Hellmodus


---

## Beiträge und Lizenz

PRs und Issues sind willkommen! Bitte öffne ein Issue, um größere Änderungen zu besprechen, bevor du einen PR einreichst.

- Bugs melden: [Issue öffnen](../../issues)
- Funktionsanfragen: [Issue öffnen](../../issues)

---

## License

[Apache 2.0](LICENSE)
