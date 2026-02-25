<div align="center">

# AI Memory

**你的對話，私密保存。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [回到首頁](README.md)

</div>

---

> 一個 Chrome 擴充套件，能在背景**靜默捕捉**你在 ChatGPT、Claude、Gemini 的對話，並以語意向量的方式儲存在本地端。透過一鍵 **Recall** 按鈕，將最相關的過去記憶注入新的對話中，讓 AI 了解你的歷史脈絡。
>
> **100% 本地端。無雲端。無伺服器。無需帳號。**

---

## 安裝

### 一般使用者 — 從 Release 載入

> _Chrome Web Store 上架中，敬請期待。_

目前請從 Release 手動安裝：

1. 前往 [Releases](../../releases) 頁面，下載最新的 `.zip` 檔
2. 解壓縮
3. 開啟 Chrome → `chrome://extensions/`
4. 右上角開啟「**開發人員模式**」
5. 點選「**載入未封裝項目**」→ 選擇解壓縮後的資料夾

### 開發者 — 從原始碼建置

**需求：** Node.js 18+、pnpm（`npm install -g pnpm`）、Chrome / Edge（MV3）

```bash
git clone <repository-url>
cd AI_Memory
pnpm install

# 開發模式 — 每次儲存後自動重建
pnpm dev
```

接著在 `chrome://extensions/` 用「**載入未封裝項目**」選取 `build/chrome-mv3-dev/`。

```bash
# 正式建置
pnpm build
# 輸出：build/chrome-mv3-prod/
```

> 每次修改程式後：在 `chrome://extensions/` 對 AI Memory 按「**重新載入**」，並重新整理（F5）已開啟的 AI 頁面。

---

## 功能總覽

| 功能 | 說明 |
|------|------|
| **被動捕捉** | 自動攔截 ChatGPT / Claude / Gemini 的對話，靜默儲存，無需任何手動操作 |
| **混合檢索** | 語意向量搜尋（時間衰減）× 關鍵字搜尋（BM25），以 RRF 融合排名 |
| **一鍵召回** | 在 ChatGPT 輸入框旁點擊 Recall 按鈕，自動注入相關記憶作為 RAG 上下文 |
| **本地備份** | 匯出 / 匯入完整備份（JSON，含語意向量） |
| **常用 Prompt** | 儲存提示詞，支援 Trie 自動建議、資料夾分類、拖曳整理 |
| **浮動面板** | 每個 AI 網站上的可拖曳記憶面板 |
| **8 種語系** | zh-TW · zh-CN · en · ja · ko · es · fr · de — 依瀏覽器 locale 自動切換 |
| **深色 / 淺色主題** | Apple Liquid Glass 風格切換 |

**支援平台：** ChatGPT（`chat.openai.com` / `chatgpt.com`）· Gemini（`gemini.google.com`）· Claude — _開發中_

---

# 如何匯出ChatGPT/Gemini聊天記錄？


## ChatGPT 聊天紀錄匯出步驟

1. 登入你的 ChatGPT 帳號並進入主畫面。
2. 點擊畫面角落的「個人頭像」或「名稱」開啟選單。
3. 選擇「Settings」(設定)。
4. 進入「Data controls」(資料控制) 頁籤。
5. 找到「Export data」(匯出資料) 選項並點擊「Export」(匯出)。
6. 系統會跳出確認視窗，點選「Confirm export」(確認匯出)。
7. 你的註冊信箱將會收到一封包含下載連結的電子郵件（注意：提出請求後，可能會需要等待高達 24 小時才會收到 export 信件）。
8. 點擊郵件中的連結下載 ZIP 壓縮檔，解壓縮後裡面包含對話紀錄的檔案會是 `conversations-00x.json`。


## Gemini 聊天紀錄匯出步驟

Gemini 的完整資料匯出是透過 Google Takeout (Google 匯出) 服務來進行整合的。

1. 登入你的 Google 帳號，並前往 [Google Takeout](https://takeout.google.com) 網頁。
2. 點擊頁面頂部的「取消全選」，清除預設的所有 Google 服務。
3. 向下捲動列表，找到並勾選「我的活動」(My Activity)（注意：不是選取 ~~Gemini Apps~~）。
4. 點擊該區塊下方的「多種格式」按鈕。
5. 在跳出的設定視窗中，將第一個活動紀錄的格式從「HTML」更改為「JSON」，並點選確定。
6. 捲動到頁面最下方，點擊「下一步」。
7. 選擇你要的傳送方式 (例如：以電子郵件傳送下載連結)，保留預設的檔案類型與大小上限後，點擊「建立匯出作業」。
8. 等待系統處理完成並收到下載連結的電子郵件。下載解壓縮後，輸出的紀錄檔案會是 `my activity.json`。

---

## 它是如何運作的

```
你在 ChatGPT / Claude / Gemini 聊天
        │  （擴充套件在背景靜默捕捉）
        ▼
記憶儲存在本地 IndexedDB
+ 語意向量（ONNX，在瀏覽器中執行）
+ 關鍵字索引（MiniSearch / BM25，在 Service Worker 記憶體中）
        │
        │  之後 — 你開始新的對話
        ▼
點擊 ChatGPT 輸入框旁的 🧠 Recall
        │
        ▼
混合搜尋：
  路線 A — 向量相似度 × 時間衰減（近期 = 較高權重）
  路線 B — BM25 關鍵字搜尋（前綴比對）
  融合   — 倒數排名融合（RRF）
        │
        ▼
Top-k 記憶以 RAG 格式注入輸入框
AI 現在擁有你的歷史對話作為背景知識
```

### 搜尋演算法（詳細）

```
路線 A — 向量搜尋 + 時間衰減
  查詢文字 → Float32Array 向量（ONNX，Offscreen Document）
  對每筆記錄：dot_product(q, r.embedding) × exp(-0.01 × 距今天數)
  以 parentId 分組 → 每組取最高衰減分數
  降冪排序 → vectorRanked[]
  （半衰期 ≈ 69 天，λ = 0.01）

路線 B — 關鍵字搜尋（MiniSearch / BM25）
  miniSearch.search(query, { prefix: true })
  前綴比對："py" 可找到 "python"，"react" 可找到 "reactivity"
  依 BM25 分數排序 → kwRanked[]

融合 — 倒數排名融合（RRF，k = 60）
  rrfScore[key] += 1 / (60 + rank)  對每份排名計算
  加總兩份清單 → 降冪排序 → top-k → 合併 chunks → SearchResult[]
```

**回退機制：** 若 embedding 失敗，僅回傳關鍵字結果；若無關鍵字命中，僅回傳向量結果。

---

## 隱私與安全性

此擴充套件會攔截你的 AI 對話內容。以下是它明確做與不做的事：

| 問題 | 答案 |
|------|------|
| 資料存在哪裡？ | **僅在瀏覽器本機的 IndexedDB**（`AIMemoryDB`）— 永遠不會離開你的裝置 |
| 會發送網路請求嗎？ | **只有一次** — 首次執行時下載 ONNX 向量模型。對話資料絕不上傳。 |
| 網站能看到我的記憶嗎？ | 不行。資料隔離在擴充套件的儲存空間，頁面腳本無法存取。 |
| 可以刪除資料嗎？ | 可以 — 在浮動面板中軟刪除個別記錄，或透過 DevTools → IndexedDB 清除全部。 |

> **把這個擴充套件當成本地日記。** 它能看到你在支援的 AI 網站上輸入和收到的所有內容。如有疑慮，歡迎審查原始碼。

---

## 技術棧

| 層 | 技術 |
|----|------|
| 框架 | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + 自訂 Theme Token |
| 持久化 | IndexedDB via [Dexie](https://dexie.org) |
| 向量搜尋 | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| 關鍵字搜尋 | [MiniSearch](https://github.com/lucaong/minisearch) (BM25，記憶體內) |
| 語言 | TypeScript |

<details>
<summary><strong>📂 專案結構</strong></summary>

```
src/
├── background/
│   ├── index.ts               訊息路由、捕捉處理、MiniSearch 同步
│   ├── search.ts              混合檢索引擎（向量×衰減 + BM25 + RRF）
│   ├── db.ts                  IndexedDB (Dexie) 操作
│   ├── embedding.ts           ONNX 模型名稱 / 版本常數
│   ├── injector.ts            MAIN-world fetch/XHR 攔截器（注入頁面）
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1 解析器
│       ├── claude.ts          Claude SSE 解析器
│       └── gemini.ts          Gemini XHR StreamGenerate 解析器
├── contents/
│   ├── interceptor.ts         ISOLATED-world 橋接 + <title> MutationObserver
│   ├── memory-float-ui.tsx    浮動面板 content script 入口
│   └── chatgpt-injector.tsx   Recall 按鈕注入 + RAG prompt 組裝
├── tabs/
│   └── offscreen.tsx          ONNX 推論（Offscreen Document — 需要 DOM）
├── popup/
│   ├── index.tsx              Popup 根元件 — 滑動面板導航
│   └── components/
│       ├── MainMenuView.tsx   主選單 + 常用 Prompt 區塊
│       ├── MemoryTableView.tsx 依會話分組的記憶列表
│       ├── ImportView.tsx     JSON 匯入 UI
│       ├── ExportView.tsx     JSON 匯出 UI
│       ├── FavoritePromptsSection.tsx Trie 自動建議提示詞
│       └── FolderView.tsx     拖曳資料夾管理
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx 可拖曳浮動面板（Logo + 面板）
├── i18n/
│   ├── translations.ts        8 語言字串對照表
│   ├── LanguageContext.tsx    語言切換（localStorage）
│   └── ThemeContext.tsx       深色 / 淺色主題（localStorage）
└── types/
    ├── memory.ts              MemoryRecord · SearchResult 介面
    └── messages.ts            所有 Chrome 訊息型別定義
```

</details>

---

## 除錯與測試

| 目標 | 方法 |
|------|------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | 右鍵擴充圖示 → **檢查快顯視窗** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| 手動測試搜尋 | Service Worker Console 執行：`testSearch('關鍵字', 5)` |

```bash
pnpm test              # 單元測試（Vitest）
pnpm test:integration  # 整合測試
pnpm test:e2e          # E2E 測試（Playwright — 需先 build）
```


---

## 貢獻與授權

歡迎提交 PR 與 Issue！重大變更請先開 Issue 討論。

- 回報 Bug：[開啟 Issue](../../issues)
- 功能建議：[開啟 Issue](../../issues)

---

## License

[MIT](LICENSE)
