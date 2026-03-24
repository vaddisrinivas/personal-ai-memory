<div align="center">

# Personal AI Memory

**你的对话，私密保存。**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cjkjgbddkaoogdbfffiooeppnmbplpnh?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-supported-74aa9c?logo=openai&logoColor=white)](https://chatgpt.com)
[![Claude](https://img.shields.io/badge/Claude-supported-d97757?logo=anthropic&logoColor=white)](https://claude.ai)
[![Gemini](https://img.shields.io/badge/Gemini-supported-4285F4?logo=google&logoColor=white)](https://gemini.google.com)
[![Perplexity](https://img.shields.io/badge/Perplexity-supported-20808D?logo=perplexity&logoColor=white)](https://perplexity.ai)
[![Grok](https://img.shields.io/badge/Grok-supported-000000?logo=x&logoColor=white)](https://grok.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [返回首页](../README.md)


<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>
</div>

---

> 一个 Chrome 扩展，能在后台**静默捕获**你在 ChatGPT、Claude、Gemini、Perplexity、Grok 的对话，并以语义向量的方式存储在本地端。通过一键 **Recall** 按钮，将最相关的过去记忆注入新的对话中，让 AI 了解你的历史背景。
>
> **100% 本地端。无云端。无服务器。无需账号。**

---

## 安装

### 普通用户 — Chrome Web Store

直接从 [Chrome Web Store](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh) 安装。

> **注意：** Chrome Web Store 版本更新可能较慢。如需最新功能，请至 [Releases](../../releases) 页面下载最新 `.zip` 并手动加载（步骤如下）。

### 手动从 Release 安装

1. 前往 [Releases](../../releases) 页面，下载最新的 `.zip` 文件
2. 解压缩
3. 打开 Chrome → `chrome://extensions/`
4. 右上角开启「**开发者模式**」
5. 点击「**加载已解压的扩展程序**」→ 选择解压后的文件夹

### 开发者 — 从源码构建

**要求：** Node.js 18+、pnpm（`npm install -g pnpm`）、Chrome / Edge（MV3）

```bash
# 将此仓库 Fork 到你自己的 GitHub 账户
git clone https://github.com/<your-github-username>/personal-ai-memory.git
cd personal-ai-memory
pnpm install

# 开发模式 — 每次保存后自动重建
pnpm dev
```

然后在 `chrome://extensions/` 用「**加载已解压的扩展程序**」选取 `build/chrome-mv3-dev/`。

```bash
# 正式构建
pnpm build
# 输出：build/chrome-mv3-prod/
```

> 每次修改代码后：在 `chrome://extensions/` 对 AI Memory 点击「**重新加载**」，并刷新（F5）已打开的 AI 页面。

---

## 功能总览

| 功能 | 说明 |
|------|------|
| **被动捕获** | 自动拦截 ChatGPT / Claude / Gemini / Perplexity / Grok 的对话，静默存储，无需任何手动操作。只要进入页面，即可自动擷取已有的对话记录。 |
| **混合检索** | 语义向量搜索（时间衰减）× 关键字搜索（BM25），以 RRF 融合排名 |
| **一键召回** | 在所有支持平台的输入框旁点击 Recall 按钮，自动注入相关记忆作为 RAG 上下文 |
| **本地备份** | 导出 / 导入完整备份（JSON，含语义向量） |
| **常用 Prompt** | 存储提示词，支持 Trie 自动建议、文件夹分类、拖拽整理 |
| **浮动面板** | 每个 AI 网站上的可拖拽记忆面板 |
| **8 种语言** | zh-TW · zh-CN · en · ja · ko · es · fr · de — 依浏览器 locale 自动切换 |
| **深色 / 浅色主题** | Apple Liquid Glass 风格切换 |

**支持平台：** ChatGPT（`chat.openai.com` / `chatgpt.com`）· Gemini（`gemini.google.com`）· Claude（`claude.ai`）· Perplexity（`perplexity.ai`）· Grok（`grok.com`）

---

## 如何导出聊天记录？

### ChatGPT 导出步骤

1. 登录 ChatGPT 并进入主界面。
2. 点击角落的"个人头像"或"名称"打开菜单。
3. 选择"Settings"（设置）。
4. 进入"Data controls"（数据控制）标签页。
5. 找到"Export data"并点击"Export"。
6. 系统弹出确认窗口，点击"Confirm export"。
7. 你的邮箱将收到包含下载链接的邮件（可能需要等待最多 24 小时）。
8. 下载 ZIP 解压缩后，对话记录文件为 `conversations-00x.json`。

### Gemini 导出步骤

通过 Google Takeout 导出：

1. 前往 [Google Takeout](https://takeout.google.com) 并登录。
2. 点击"取消全选"清除所有默认服务。
3. 向下滚动，勾选"我的活动"（My Activity）（注意：不是选 ~~Gemini Apps~~）。
4. 点击"多种格式"按钮。
5. 将第一个活动格式从"HTML"改为"JSON"，点确定。
6. 点击"下一步"→ 选择发送方式 → "创建导出作业"。
7. 等待邮件通知，解压缩后文件为 `my activity.json`。

### Claude 导出步骤

1. 前往 [https://claude.ai/settings/data-privacy-controls](https://claude.ai/settings/data-privacy-controls)。
2. 点击"Export data"。
3. 等待下载链接邮件。
4. 解压缩后，对话记录文件为 `conversations.json`。

### Perplexity

> Perplexity **不支持**用户数据导出。必须逐一点击对话页面，由扩展自动捕获。

### Grok 导出步骤

1. 前往 [https://grok.com](https://grok.com)。
2. 点击左下角个人头像 → **Settings** → **Data controls**。
3. 点击"Export Account Data"。
4. 等待数小时后收到下载链接邮件。
5. 解压缩后，文件为 `prod-grok-backend.json`。

---

## 它是如何运作的

```
你在 ChatGPT / Claude / Gemini / Perplexity / Grok 聊天
        │  （扩展在后台静默捕获）
        ▼
记忆存储在本地 IndexedDB
+ 语义向量（ONNX，在浏览器中运行）
+ 关键字索引（MiniSearch / BM25，在 Service Worker 内存中）
        │
        │  之后 — 你开始新的对话
        ▼
点击任意支持平台输入框旁的 🧠 Recall
        │
        ▼
混合搜索：
  路线 A — 向量相似度 × 时间衰减（近期 = 较高权重）
  路线 B — BM25 关键字搜索（前缀匹配）
  融合   — 倒数排名融合（RRF）
        │
        ▼
Top-k 记忆以 RAG 格式注入输入框
AI 现在拥有你的历史对话作为背景知识
```

### 搜索算法（详细）

```
路线 A — 向量搜索 + 时间衰减
  查询文字 → Float32Array 向量（ONNX，Offscreen Document）
  对每条记录：dot_product(q, r.embedding) × exp(-0.01 × 距今天数)
  以 parentId 分组 → 每组取最高衰减分数
  降序排列 → vectorRanked[]
  （半衰期 ≈ 69 天，λ = 0.01）

路线 B — 关键字搜索（MiniSearch / BM25）
  miniSearch.search(query, { prefix: true })
  前缀匹配："py" 可找到 "python"，"react" 可找到 "reactivity"
  依 BM25 分数排序 → kwRanked[]

融合 — 倒数排名融合（RRF，k = 60）
  rrfScore[key] += 1 / (60 + rank)  对每份排名计算
  汇总两份列表 → 降序排列 → top-k → 合并 chunks → SearchResult[]
```

**回退机制：** 若 embedding 失败，仅返回关键字结果；若无关键字命中，仅返回向量结果。

---

## 隐私与安全

此扩展会拦截你的 AI 对话内容。以下是它明确做与不做的事：

| 问题 | 答案 |
|------|------|
| 数据存在哪里？ | **仅在浏览器本机的 IndexedDB**（`AIMemoryDB`）— 永远不会离开你的设备 |
| 会发送网络请求吗？ | **只有一次** — 首次运行时下载 ONNX 向量模型。对话数据绝不上传。 |
| 网站能看到我的记忆吗？ | 不能。数据隔离在扩展的存储空间，页面脚本无法访问。 |
| 可以删除数据吗？ | 可以 — 在浮动面板中软删除单条记录，或通过 DevTools → IndexedDB 清除全部。 |

> **把这个扩展当成本地日记。** 它能看到你在支持的 AI 网站上输入和收到的所有内容。如有疑虑，欢迎审查源码。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + 自定义 Theme Token |
| 持久化 | IndexedDB via [Dexie](https://dexie.org) |
| 向量搜索 | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| 关键字搜索 | [MiniSearch](https://github.com/lucaong/minisearch) (BM25，内存中) |
| 语言 | TypeScript |

<details>
<summary><strong>📂 项目结构</strong></summary>

```
src/
├── background/
│   ├── index.ts               消息路由、捕获处理、MiniSearch 同步
│   ├── search.ts              混合检索引擎（向量×衰减 + BM25 + RRF）
│   ├── db.ts                  IndexedDB (Dexie) 操作
│   ├── embedding.ts           ONNX 模型名称 / 版本常量
│   ├── injector.ts            MAIN-world fetch/XHR 拦截器（注入页面）
│   ├── chunking.ts            文本分块（500 字符段、75 字符重叠）
│   ├── domSync.ts             DOM 对话同步
│   ├── offscreen.ts           Offscreen document 消息处理
│   ├── perplexityBgFetch.ts   Perplexity 背景抓取辅助
│   ├── syncEmbeddings.ts      嵌入同步工具
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1 解析器
│       ├── claude.ts          Claude SSE 解析器
│       ├── gemini.ts          Gemini XHR StreamGenerate 解析器 + 被动捕获
│       ├── perplexity.ts      Perplexity SSE 解析器
│       └── grok.ts            Grok SSE 解析器
├── contents/
│   ├── interceptor.ts         ISOLATED-world 桥接 + <title> MutationObserver
│   ├── memory-float-ui.tsx    浮动面板 content script 入口
│   ├── chatgpt-injector.tsx   ChatGPT Recall 按钮 + RAG prompt
│   ├── claude-injector.tsx    Claude Recall 按钮
│   ├── gemini-injector.tsx    Gemini 被动捕获 + Recall 按钮
│   ├── grok-injector.tsx      Grok Recall 按钮
│   └── perplexity-injector.tsx Perplexity Recall 按钮
├── importers/
│   ├── base.ts                导入器基接口
│   ├── chatgptConversations.ts ChatGPT JSON 导入器
│   ├── claudeConversations.ts  Claude JSON 导入器
│   ├── geminiTakeout.ts       Gemini Takeout 导入器
│   ├── grokConversations.ts   Grok JSON 导入器
│   └── index.ts               导入器注册
├── tabs/
│   └── offscreen.tsx          ONNX 推理（Offscreen Document — 需要 DOM）
├── popup/
│   ├── index.tsx              Popup 根组件 — 滑动面板导航
│   └── components/
│       ├── FloatingMemoryPanel.tsx 可拖拽浮动面板（Logo + 面板）
│       ├── MemoryMenuContent.tsx   记忆菜单内容（侧边栏 / 弹窗）
│       ├── MemoryTableView.tsx 按会话分组的记忆列表
│       ├── ImportView.tsx     JSON 导入 UI
│       ├── ExportView.tsx     JSON 导出 UI
│       ├── FavoritePromptsSection.tsx Trie 自动建议提示词
│       └── FolderView.tsx     拖拽文件夹管理
├── utils/
│   ├── chrome-storage.ts      共享 chrome.storage.local 辅助（读/存/订阅）
│   ├── rag.ts                 RAG prompt 格式化
│   ├── recall-button.ts       Recall 按钮创建与注入
│   ├── recall-helpers.ts      共享 Recall 工具
│   ├── trie.ts                Trie 自动完成数据结构
│   ├── message-passing.ts     类型安全的 Chrome 消息传递
│   └── onboarding-highlight.ts 入门步骤高亮辅助
├── i18n/
│   ├── translations.ts        8 语言字符串对照表
│   ├── LanguageContext.tsx    语言切换（chrome.storage — 跨标签页同步）
│   ├── ThemeContext.tsx       深色 / 浅色主题（chrome.storage — 跨标签页同步）
│   └── lang-storage.ts        语言持久化辅助
└── types/
    ├── memory.ts              MemoryRecord · SearchResult 接口
    └── messages.ts            所有 Chrome 消息类型定义
```

</details>

---

## 调试与测试

| 目标 | 方法 |
|------|------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | 右键扩展图标 → **检查弹出内容** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| 手动测试搜索 | Service Worker Console 执行：`testSearch('关键词', 5)` |

```bash
pnpm test              # 单元测试（Vitest）
pnpm test:integration  # 集成测试
pnpm test:e2e          # E2E 测试（Playwright — 需先 build）
```


---

## 更新日志

请参阅 [CHANGELOG.md](../CHANGELOG.md) 获取完整的版本历史。


---

## 贡献与许可

欢迎提交 PR 与 Issue！重大变更请先开 Issue 讨论。

- 报告 Bug：[开启 Issue](../../issues)
- 功能建议：[开启 Issue](../../issues)

---

## License

[Apache 2.0](LICENSE)
