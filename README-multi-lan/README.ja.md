<div align="center">

# Personal AI Memory

**あなたの会話を、プライベートに記憶。**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cjkjgbddkaoogdbfffiooeppnmbplpnh?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-supported-74aa9c?logo=openai&logoColor=white)](https://chatgpt.com)
[![Claude](https://img.shields.io/badge/Claude-supported-d97757?logo=anthropic&logoColor=white)](https://claude.ai)
[![Gemini](https://img.shields.io/badge/Gemini-supported-4285F4?logo=google&logoColor=white)](https://gemini.google.com)
[![Perplexity](https://img.shields.io/badge/Perplexity-supported-20808D?logo=perplexity&logoColor=white)](https://perplexity.ai)
[![Grok](https://img.shields.io/badge/Grok-supported-000000?logo=x&logoColor=white)](https://grok.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [トップへ](../README.md)

<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>

</div>

---

> ChatGPT / Claude / Gemini / Perplexity / Grok の会話を**バックグラウンドで自動キャプチャ**し、ブラウザのローカルにセマンティックベクトルとして保存する Chrome 拡張機能 — ワンクリックの **Recall** ボタンで関連する過去の記憶を新しいチャットに注入します。
>
> **100% ローカル。クラウドなし。サーバーなし。アカウント不要。**


---

## インストール

### 一般ユーザー — Chrome Web Store

[Chrome Web Store](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh) から直接インストールできます。

> **注意：** Chrome Web Store のバージョンは最新リリースより遅れる場合があります。最新機能をご利用の場合は、[Releases](../../releases) ページから最新 `.zip` をダウンロードして手動でロードしてください（手順は下記）。

### Release から手動インストール

1. [Releases](../../releases) ページから最新の `.zip` をダウンロード
2. 解凍する
3. Chrome → `chrome://extensions/` を開く
4. 右上の**デベロッパーモード**をオン
5. **パッケージ化されていない拡張機能を読み込む** → 解凍したフォルダを選択

### 開発者 — ソースコードからビルド

**要件:** Node.js 18+、pnpm（`npm install -g pnpm`）、Chrome / Edge（MV3）

```bash
# このリポジトリを自分の GitHub アカウントにフォークします
git clone https://github.com/<your-github-username>/personal-ai-memory.git
cd personal-ai-memory
pnpm install

# 開発モード — 保存のたびに自動リビルド
pnpm dev
```

`chrome://extensions/` の**パッケージ化されていない拡張機能を読み込む**で `build/chrome-mv3-dev/` を選択してください。

```bash
# プロダクションビルド
pnpm build
# 出力: build/chrome-mv3-prod/
```

> コード変更後: `chrome://extensions/` で AI Memory の**再読み込み**をクリックし、開いている AI タブを更新（F5）してください。

---

## 機能一覧

| 機能 | 詳細 |
|------|------|
| **パッシブキャプチャ** | ChatGPT / Claude / Gemini / Perplexity / Grok を自動インターセプト — セットアップ不要、クリック不要。ページを開くだけで既存の会話も自動的にキャプチャされます。 |
| **ハイブリッド検索** | ベクトル検索（時間減衰）+ BM25、RRF でベスト結果に融合 |
| **ワンクリック Recall** | すべての対応プラットフォームで関連する記憶を RAG プロンプトとして注入 |
| **ローカルバックアップ** | JSON として完全バックアップをエクスポート / インポート（埋め込みベクトル含む） |
| **お気に入りプロンプト** | 保存、Trie オートコンプリート、ドラッグ＆ドロップフォルダ整理 |
| **フローティングパネル** | すべての AI サイトでドラッグ可能なメモリパネル |
| **8 言語 UI** | zh-TW · zh-CN · en · ja · ko · es · fr · de — 自動検出 |
| **ダーク / ライトテーマ** | Apple Liquid Glass 風トグル |

**対応プラットフォーム:** ChatGPT（`chat.openai.com` / `chatgpt.com`）· Gemini（`gemini.google.com`）· Claude（`claude.ai`）· Perplexity（`perplexity.ai`）· Grok（`grok.com`）

---

## チャット履歴のエクスポート方法

### ChatGPT

1. ChatGPT アカウントにログインし、メイン画面を開きます。
2. 画面の隅にある「プロフィール画像」または「名前」をクリックしてメニューを開きます。
3. 「Settings」（設定）を選択します。
4. 「Data controls」（データコントロール）タブを開きます。
5. 「Export data」を見つけ、「Export」をクリックします。
6. 確認ウィンドウが表示されるので、「Confirm export」をクリックします。
7. 登録したメールアドレスにダウンロードリンクを含むメールが届きます（最大 24 時間かかる場合があります）。
8. ZIP ファイルをダウンロードして解凍すると、会話履歴ファイルは `conversations-00x.json` です。

### Gemini

Google Takeout 経由でエクスポート：

1. [Google Takeout](https://takeout.google.com) にアクセスしてログインします。
2. 「選択をすべて解除」をクリックします。
3. リストを下にスクロールし、「マイ アクティビティ」（My Activity）を見つけてチェックを入れます（~~Gemini Apps~~ は選択しません）。
4. 「複数の形式」ボタンをクリックします。
5. 最初のアクティビティの形式を「HTML」から「JSON」に変更し、OK をクリックします。
6. 「次のステップ」→ 配信方法を選択 → 「エクスポートを作成」をクリックします。
7. メールを待ちます。解凍後、ファイルは `my activity.json` です。

### Claude

1. [https://claude.ai/settings/data-privacy-controls](https://claude.ai/settings/data-privacy-controls) にアクセスします。
2. 「Export data」をクリックします。
3. ダウンロードリンクのメールを待ちます。
4. 解凍後、会話履歴ファイルは `conversations.json` です。

### Perplexity

> Perplexity はユーザーデータのエクスポートに**対応していません**。各会話を個別に開く必要があります。

### Grok

1. [https://grok.com](https://grok.com) にアクセスします。
2. 左下のプロフィール画像をクリック → **Settings** → **Data controls**。
3. 「Export Account Data」をクリックします。
4. 数時間後にダウンロードリンクのメールが届きます。
5. 解凍後、ファイルは `prod-grok-backend.json` です。

---

## 仕組み

```
ChatGPT / Claude / Gemini / Perplexity / Grok でチャット
        │  （拡張機能がバックグラウンドで自動キャプチャ）
        ▼
ローカル IndexedDB に記憶を保存
+ セマンティック埋め込みベクトル（ONNX、ブラウザで実行）
+ キーワードインデックス（MiniSearch / BM25、Service Worker メモリ）
        │
        │  後で — 新しいチャットを開始
        ▼
対応プラットフォームの入力欄横の 🧠 Recall をクリック
        │
        ▼
ハイブリッド検索:
  ルート A — ベクトル類似度 × 時間減衰（最近 = 高いウェイト）
  ルート B — BM25 キーワード検索（プレフィックスマッチング）
  融合     — Reciprocal Rank Fusion（RRF）
        │
        ▼
上位 k 件の記憶が RAG コンテキストとして入力欄に注入
AI があなたの会話履歴を背景知識として活用
```

### 検索アルゴリズム（詳細）

```
ルート A — ベクトル検索 + 時間減衰
  クエリテキスト → Float32Array（ONNX、Offscreen Document）
  各レコード: dot_product(q, r.embedding) × exp(-0.01 × 経過日数)
  parentId でグループ化 → グループごとに最高減衰スコアを保持
  降順ソート → vectorRanked[]
  （半減期 ≈ 69 日、λ = 0.01）

ルート B — キーワード検索（MiniSearch / BM25）
  miniSearch.search(query, { prefix: true })
  プレフィックスマッチング: "py" → "python"、"react" → "reactivity"
  BM25 スコアでソート → kwRanked[]

融合 — Reciprocal Rank Fusion（RRF、k = 60）
  rrfScore[key] += 1 / (60 + rank)  各リストに適用
  両リストを合計 → 降順 → top-k → チャンク結合 → SearchResult[]
```

**フォールバック:** 埋め込み失敗時はキーワード結果のみ返す；キーワードマッチなし時はベクトル結果のみ返す。

---

## プライバシーとセキュリティ

この拡張機能は AI の会話をインターセプトします。何をするか・しないかを明示します：

| 質問 | 回答 |
|------|------|
| データはどこに保存されますか？ | **ブラウザローカルの IndexedDB のみ**（`AIMemoryDB`）— デバイスから外に出ることはありません |
| ネットワークリクエストを送りますか？ | **一度だけ** — 初回起動時に ONNX 埋め込みモデルをダウンロード。会話データは一切アップロードされません。 |
| ウェブサイトが私の記憶を見られますか？ | いいえ。データは拡張機能のストレージに隔離され、ページスクリプトからアクセス不可。 |
| データを削除できますか？ | できます — フローティングパネルから個別レコードをソフト削除、または DevTools → IndexedDB で全削除。 |

> **この拡張機能をローカル日記として扱ってください。** 対応 AI サイトで入力・受信するすべての内容を見ることができます。懸念がある場合はソースコードを確認してください。

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| 拡張機能フレームワーク | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + カスタムテーマトークン |
| 永続化 | IndexedDB via [Dexie](https://dexie.org) |
| ベクトル検索 | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| キーワード検索 | [MiniSearch](https://github.com/lucaong/minisearch) (BM25、インメモリ) |
| 言語 | TypeScript |

<details>
<summary><strong>📂 プロジェクト構成</strong></summary>

```
src/
├── background/
│   ├── index.ts               メッセージルーター · キャプチャハンドラー · MiniSearch 同期
│   ├── search.ts              ハイブリッド検索エンジン（ベクトル×減衰 + BM25 + RRF）
│   ├── db.ts                  IndexedDB (Dexie) 操作
│   ├── embedding.ts           ONNX モデル名 / バージョン定数
│   ├── injector.ts            MAIN-world fetch/XHR インターセプター（ページに注入）
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1 パーサー
│       ├── claude.ts          Claude SSE パーサー
│       ├── gemini.ts          Gemini XHR StreamGenerate パーサー + パッシブキャプチャ
│       ├── perplexity.ts      Perplexity SSE パーサー
│       └── grok.ts            Grok SSE パーサー
├── contents/
│   ├── interceptor.ts         ISOLATED-world ブリッジ + <title> MutationObserver
│   ├── memory-float-ui.tsx    フローティングパネル content script エントリーポイント
│   ├── chatgpt-injector.tsx   Recall ボタン注入 + RAG プロンプト組み立て
│   ├── gemini-injector.tsx    Gemini パッシブキャプチャ + Recall ボタン
│   └── grok-injector.tsx      Grok パッシブキャプチャ
├── tabs/
│   └── offscreen.tsx          ONNX 推論（Offscreen Document — DOM 必要）
├── popup/
│   ├── index.tsx              Popup ルート — スライディングパネルナビゲーション
│   └── components/
│       ├── MainMenuView.tsx   メインメニュー + お気に入りプロンプトセクション
│       ├── MemoryTableView.tsx セッション別グループ化された記憶リスト
│       ├── ImportView.tsx     JSON インポート UI
│       ├── ExportView.tsx     JSON エクスポート UI
│       ├── FavoritePromptsSection.tsx Trie オートコンプリートプロンプト
│       └── FolderView.tsx     ドラッグ＆ドロップフォルダ管理
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx ドラッグ可能なフローティングパネル（ロゴ + パネル）
├── i18n/
│   ├── translations.ts        8 言語文字列マップ
│   ├── LanguageContext.tsx    言語切替（localStorage）
│   └── ThemeContext.tsx       ダーク / ライトテーマ（localStorage）
└── types/
    ├── memory.ts              MemoryRecord · SearchResult インターフェース
    └── messages.ts            すべての Chrome メッセージ型定義
```

</details>

---

## デバッグとテスト

| 対象 | 方法 |
|------|------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | 拡張機能アイコンを右クリック → **ポップアップを検査** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| 手動検索テスト | Service Worker コンソール: `testSearch('キーワード', 5)` |

```bash
pnpm test              # 単体テスト（Vitest）
pnpm test:integration  # 統合テスト
pnpm test:e2e          # E2E テスト（Playwright — 事前にビルドが必要）
```

---

## 更新履歴

### v0.0.5 — 2026-03-12
- **修正：** Gemini パッシブキャプチャが最新の DOM セレクター（`<user-query>` / `<message-content>`）を使用するよう更新 — Gemini フロントエンド更新後に会話がサイレントに欠落していた問題を解消。
- **修正：** Gemini の重複キャプチャを排除 — 安定した決定論的 Record ID と XHR デバウンス（1 秒）により、ページリロード時やストリーミング中の重複保存を防止。
- **修正：** Recall ボタンが入力欄が空の場合や記憶がすでに注入済みの場合に明確なアラートを表示 — 全プラットフォーム（ChatGPT・Claude・Gemini・Grok・Perplexity）での誤った二重注入を防止。
- **修正：** 保存前に Recall 注入の `[System Context]` テンプレートを自動除去 — 実際のユーザークエリのみを記憶に保存。
- **修正：** Perplexity Recall ボタンが「モデルを選択」ボタンの直後に正しく表示されるよう修正。
- **修正：** Gemini の会話タイトルを `document.title` ではなくサイドバー項目から取得するよう変更 — セッション名がより正確に。
- **修正：** Gemini テキスト注入ロジックを書き直し、入力処理の安定性を向上。
- **修正：** Grok 入力検出を改善 — 「入力が空」の誤検出を解消。
- **修正：** Gemini・ChatGPT セッションの記憶リスト重複除去を改善。
- **改善：** Recall ボタンのアラートが拡張機能の表示言語に合わせて表示されるよう変更。

### v0.0.4 — 2026-03-06
- **新機能：** Grok（`grok.com`）対応 — 閲覧中に会話をサイレントキャプチャ。
- **新機能：** Gemini パッシブメッセージキャプチャ — ページを開くだけで既存の会話が自動的にキャプチャされます。

### v0.0.3 — 2026-03-02
- Perplexity（`perplexity.ai`）対応 — 閲覧中に会話をサイレントキャプチャ。注意：Perplexity はユーザーデータのエクスポートに対応していないため、各会話を個別に開く必要があります。

### v0.0.2 — 2026-03-01
- Claude ウェブ版（`claude.ai`）への完全対応 — 会話キャプチャ、Recall ボタン注入、フローティングメモリパネルが Claude で利用可能に

### v0.0.1 — 初回リリース
- ChatGPT・Gemini の会話キャプチャ
- ベクトル + BM25 ハイブリッド検索（RRF 融合）
- ワンクリック Recall ボタン（ChatGPT）
- お気に入りプロンプト（Trie オートコンプリート、ドラッグ＆ドロップフォルダ）
- JSON バックアップ エクスポート / インポート
- フローティングメモリパネル
- 8 言語 UI、ダーク / ライトテーマ

---

## コントリビュートとライセンス

PR と Issue を歓迎します！大きな変更は PR 提出前に Issue を開いて議論してください。

- バグ報告: [Issue を開く](../../issues)
- 機能リクエスト: [Issue を開く](../../issues)

---

## License

[Apache 2.0](LICENSE)
