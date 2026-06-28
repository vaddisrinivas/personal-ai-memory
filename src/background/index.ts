/**
 * Background Service Worker — entry point.
 *
 * Responsibilities:
 *   - Inject MAIN-world interceptor on AI tabs (executeScript)
 *   - Listen for CAPTURE_MESSAGE from content scripts (US1)
 *   - Route to matching platform adapter (US1)
 *   - Persist MemoryRecord to IndexedDB via db.ts (US1)
 *   - Queue embedding generation via embedding.ts (US2)
 *   - Serve QUERY_RECORDS and CLEAR_ERRORS from popup (US3)
 */

import { mainWorldInterceptor } from "./injector";
import { MODEL_NAME } from "./embedding";
import { ChatGPTAdapter } from "./adapters/chatgpt";
import { ClaudeAdapter } from "./adapters/claude";
import { GeminiAdapter } from "./adapters/gemini";
import { PerplexityAdapter } from "./adapters/perplexity";
import { GrokAdapter } from "./adapters/grok";
import type { IAdapter } from "./adapters/base";
import { stripRecallTemplate } from "./adapters/base";
import { db, isCaptureEnabled, isQuotaExceeded, safeAddRecord } from "./db";
import type {
  CaptureMessage,
  CaptureMessageResponse,
  QueryRecordsRequest,
  QueryRecordsResponse,
  ClearErrorsResponse,
  DeleteRecordRequest,
  DeleteRecordResponse,
  ClearAllMemoriesResponse,
  StatusUpdate,
  UpdateConversationTitleRequest,
  UpdateConversationTitleResponse,
  GetConversationTitlesRequest,
  GetConversationTitlesResponse,
  SearchMemoriesRequest,
  ImportMemoriesRequest,
  DomSyncRequest,
} from "../types/messages";
import { handleSearchMemories, hydrateSearchIndex, miniSearch } from "./search";
import type { MemoryRecord } from "../types/memory";
import {
  FAVORITE_PROMPTS_KEY,
  FOLDERS_STORAGE_KEY,
} from "../constants/prompts";
import { processPendingEmbeddings } from "./syncEmbeddings";
import { chunkText, expandToChunks } from "./chunking";
import {
  embedViaOffscreen,
  embedBatchViaOffscreen,
  queueEmbedding,
} from "./offscreen";
import { handleDomSync } from "./domSync";
import { maybeFetchPerplexityThreadHistory } from "./perplexityBgFetch";

// Re-export for backward compatibility (tests import chunkText/expandToChunks from this module)
export { chunkText, expandToChunks } from "./chunking";
export { embedViaOffscreen, embedBatchViaOffscreen } from "./offscreen";

// ─── Adapter Registry ─────────────────────────────────────────────────────────

const adapters: IAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new PerplexityAdapter(),
  new GrokAdapter(),
];

function findAdapter(url: string): IAdapter | undefined {
  return adapters.find((a) => a.canHandle(url));
}

// ─── Capture Handler ──────────────────────────────────────────────────────────

async function handleCaptureMessage(
  message: CaptureMessage,
): Promise<CaptureMessageResponse> {
  const { provider, rawData, url, timestamp } = message.payload;

  if (!isCaptureEnabled()) {
    console.warn("[AI Memory] Capture skipped: QUOTA_EXCEEDED");
    return { success: false, error: "QUOTA_EXCEEDED" };
  }

  const adapter = findAdapter(url);
  if (!adapter) {
    console.warn("[AI Memory] No adapter for URL:", url);
    return { success: false, error: `No adapter for URL: ${url}` };
  }

  let records: MemoryRecord[];
  try {
    records = adapter.parse(rawData, url, timestamp);
  } catch (err) {
    console.warn("[AI Memory] Adapter parse failed:", url, err);
    await db.logError("ADAPTER_PARSE_FAILED", {
      url,
      provider,
      error: String(err),
    });
    return { success: false, error: "Parse failed" };
  }

  if (!records.length) {
    console.warn("[AI Memory] No records extracted from:", url);
    return { success: false, error: "No records extracted" };
  }

  // Strip recall-injected templates from user messages
  records = records.flatMap(record => {
    if (record.role !== 'user') return [record]
    const cleaned = stripRecallTemplate(record.content)
    if (cleaned === null) return []
    if (cleaned === record.content) return [record]
    return [{ ...record, content: cleaned }]
  })
  if (!records.length) {
    return { success: false, error: 'No records after recall template filter' }
  }

  // Dedup chat history records (fromHistory=true):
  // If the session already has any records (e.g. captured via SSE), skip writing new records
  // to avoid duplicating messages.
  const hasHistoryRecords = records.some(
    (r) => r.metadata?.["fromHistory"] === true,
  );
  if (hasHistoryRecords) {
    const sessionId = records[0].sessionId;
    const sessionExists = await db.hasSessionRecords(sessionId);
    if (sessionExists) {
      return { success: true, recordId: undefined };
    }
    // Session is new — still dedup individual IDs in case of partial prior writes
    const allIds = records.map((r) => r.id);
    const newIds = new Set(await db.filterNewChatMessageUuids(allIds));
    records = records.filter((r) => newIds.has(r.id));
    if (!records.length) {
      return { success: true, recordId: undefined };
    }
  }

  const ids: string[] = [];
  for (const record of records) {
    for (const chunk of expandToChunks(record)) {
      const id = await safeAddRecord(chunk);
      if (id) {
        ids.push(id);
        // Keep MiniSearch in sync with Dexie
        try {
          miniSearch.add(chunk);
        } catch {
          /* duplicate id — already indexed */
        }
        queueEmbedding(chunk);
      }
    }
  }

  lastCaptureTime = Date.now();
  void broadcastStatusUpdate();

  if (ids.length > 0) {
    // Notify onboarding on first-ever memory saved via storage (works across all extension contexts)
    const { onboarding_first_memory_saved, onboarding_step2_active } = await chrome.storage.local.get([
      'onboarding_first_memory_saved',
      'onboarding_step2_active',
    ])
    if (onboarding_step2_active && !onboarding_first_memory_saved) {
      chrome.storage.local.set({ onboarding_first_memory_saved: true })
    }
  }

  return { success: true, recordId: ids[0] };
}

// ─── Status Broadcast ─────────────────────────────────────────────────────────

let lastCaptureTime: number | undefined;

async function broadcastStatusUpdate(): Promise<void> {
  try {
    const [totalRecords, recentRecords, errors] = await Promise.all([
      db.countTotal(),
      db.getRecent(10),
      db.getRecentErrors(5),
    ]);

    const payload: StatusUpdate = {
      type: "STATUS_UPDATE",
      payload: {
        totalRecords,
        recentRecords,
        errors,
        lastCaptureTime,
        quotaExceeded: isQuotaExceeded(),
      },
    };

    // Notify popup (extension page) — may be closed, ignore errors
    chrome.runtime.sendMessage(payload).catch(() => void 0);

    // Notify content scripts (FloatingMemoryPanel) on all AI tabs
    chrome.tabs.query({ url: AI_ORIGINS.map((o) => `${o}/*`) }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, payload).catch(() => void 0);
        }
      }
    });
  } catch {
    // Status broadcast is best-effort
  }
}

// ─── QUERY_RECORDS Handler ────────────────────────────────────────────────────

async function handleQueryRecords(
  message: QueryRecordsRequest,
): Promise<QueryRecordsResponse> {
  const { records, total } = await db.queryRecords(message.payload.filters);
  return {
    type: "QUERY_RECORDS_RESPONSE",
    payload: { records, total },
  };
}

// ─── CLEAR_ERRORS Handler ─────────────────────────────────────────────────────

async function handleClearErrors(): Promise<ClearErrorsResponse> {
  await db.clearErrors();
  return { type: "CLEAR_ERRORS_RESPONSE", payload: { success: true } };
}

// ─── DELETE_RECORD Handler ─────────────────────────────────────────────────────

async function handleDeleteRecord(
  message: DeleteRecordRequest,
): Promise<DeleteRecordResponse> {
  try {
    await db.softDeleteRecord(message.payload.recordId);
    return { type: "DELETE_RECORD_RESPONSE", payload: { success: true } };
  } catch (err) {
    return {
      type: "DELETE_RECORD_RESPONSE",
      payload: { success: false, error: String(err) },
    };
  }
}

// ─── CLEAR_ALL_MEMORIES Handler ───────────────────────────────────────────────

async function handleClearAllMemories(): Promise<ClearAllMemoriesResponse> {
  try {
    await db.clearAllMemories();
    // Also reset the in-memory MiniSearch index
    miniSearch.removeAll();
    lastCaptureTime = undefined;
    void broadcastStatusUpdate();
    return { type: "CLEAR_ALL_MEMORIES_RESPONSE", payload: { success: true } };
  } catch (err) {
    return {
      type: "CLEAR_ALL_MEMORIES_RESPONSE",
      payload: { success: false, error: String(err) },
    };
  }
}

async function handleUpdateConversationTitle(
  message: UpdateConversationTitleRequest,
): Promise<UpdateConversationTitleResponse> {
  try {
    await db.upsertConversationTitle(
      message.payload.sessionId,
      message.payload.title,
    );
    return {
      type: "UPDATE_CONVERSATION_TITLE_RESPONSE",
      payload: { success: true },
    };
  } catch (err) {
    return {
      type: "UPDATE_CONVERSATION_TITLE_RESPONSE",
      payload: { success: false, error: String(err) },
    };
  }
}

async function handleGetConversationTitles(
  message: GetConversationTitlesRequest,
): Promise<GetConversationTitlesResponse> {
  try {
    const titlesMap = await db.getConversationTitles(
      message.payload.sessionIds,
    );
    // Convert Map to Record for JSON serialization
    const titlesRecord: Record<string, string> = {};
    titlesMap.forEach((title, sessionId) => {
      titlesRecord[sessionId] = title;
    });
    return {
      type: "GET_CONVERSATION_TITLES_RESPONSE",
      payload: { titles: titlesRecord },
    };
  } catch (err) {
    return {
      type: "GET_CONVERSATION_TITLES_RESPONSE",
      payload: { titles: {} },
    };
  }
}

async function handleExportMemories() {
  try {
    const all = await db.memories.toArray();
    const { [FAVORITE_PROMPTS_KEY]: prompts, [FOLDERS_STORAGE_KEY]: folders } =
      await chrome.storage.local.get([
        FAVORITE_PROMPTS_KEY,
        FOLDERS_STORAGE_KEY,
      ]);
    const hasPrompts = Array.isArray(prompts) && prompts.length > 0;
    const hasFolders = Array.isArray(folders) && folders.length > 0;
    const version = hasFolders ? "1.2" : hasPrompts ? "1.1" : "1.0";
    const envelope = {
      metadata: {
        app: "PersonalAIMemoryLayer" as const,
        version: version as "1.0" | "1.1" | "1.2",
        exportedAt: new Date().toISOString(),
        recordCount: all.length,
        embeddingModel: all[0]?.embeddingModel ?? MODEL_NAME,
      },
      payload: all.map((r) => ({
        ...r,
        embedding: r.embedding ? Array.from(r.embedding) : undefined,
      })),
      ...(hasPrompts && { prompts }),
      ...(hasFolders && { folders }),
    };
    return { type: "EXPORT_MEMORIES_RESPONSE" as const, payload: { envelope } };
  } catch (err) {
    return {
      type: "EXPORT_MEMORIES_RESPONSE" as const,
      payload: {
        envelope: { metadata: {} as never, payload: [] },
        error: String(err),
      },
    };
  }
}

async function importMemoryRecords(
  inputRecords: ImportMemoriesRequest["payload"]["records"],
  prompts?: ImportMemoriesRequest["payload"]["prompts"],
  folders?: ImportMemoriesRequest["payload"]["folders"],
) {
  const records: MemoryRecord[] = inputRecords.map((r) => ({
      ...r,
      embedding: Array.isArray(r.embedding)
        ? new Float32Array(r.embedding)
        : undefined,
      hasEmbedding:
        Array.isArray(r.embedding) && r.embedding!.length > 0 ? 1 : 0,
    }));

  // Skip records already in the DB (idempotent re-import support)
  const allIds = records.map((r) => r.id);
  const newIds = new Set(await db.filterNewChatMessageUuids(allIds));
  const newRecords = records.filter((r) => newIds.has(r.id));
  const skippedCount = records.length - newRecords.length;

  if (newRecords.length === 0) {
    return {
      type: "IMPORT_MEMORIES_RESPONSE" as const,
      payload: { success: true, count: 0, skipped: skippedCount },
    };
  }

  await db.memories.bulkPut(newRecords);

  // Persist conversation titles extracted from import metadata (e.g. ChatGPT)
  const titleUpdates = new Map<string, string>();
  for (const r of newRecords) {
    const title = (r.metadata as Record<string, string> | undefined)
      ?.conversationTitle;
    if (title && r.sessionId && !titleUpdates.has(r.sessionId)) {
      titleUpdates.set(r.sessionId, title);
    }
  }
  for (const [sessionId, title] of titleUpdates) {
    void db.upsertConversationTitle(sessionId, title);
  }

  if (Array.isArray(prompts) && prompts.length > 0) {
    await chrome.storage.local.set({ [FAVORITE_PROMPTS_KEY]: prompts });
  }
  if (Array.isArray(folders) && folders.length > 0) {
    await chrome.storage.local.set({ [FOLDERS_STORAGE_KEY]: folders });
  }
  // Rebuild keyword index so imported records are immediately searchable
  void hydrateSearchIndex();

  // Process pending embeddings in the background (does not block display)
  void processPendingEmbeddings();

  // Notify popup so MemoryTableView reloads automatically
  void broadcastStatusUpdate();

  return {
    type: "IMPORT_MEMORIES_RESPONSE" as const,
    payload: { success: true, count: newRecords.length, skipped: skippedCount },
  };
}

async function handleImportMemories(message: ImportMemoriesRequest) {
  try {
    return await importMemoryRecords(
      message.payload.records,
      message.payload.prompts,
      message.payload.folders,
    );
  } catch (err) {
    return {
      type: "IMPORT_MEMORIES_RESPONSE" as const,
      payload: { success: false, count: 0, error: String(err) },
    };
  }
}

// ─── Local Vault Native Host Sync ─────────────────────────────────────────────

const VAULT_NATIVE_HOST = "com.ai_chat_vault.host";
const VAULT_SYNC_ALARM = "ai-chat-vault-native-sync";
const VAULT_BATCH_SIZE = 500;
const VAULT_MAX_BATCHES_PER_WAKE = 20;

type VaultManifestResponse = {
  ok: boolean;
  records?: number;
  tool_records?: number;
  chunk_count?: number;
  generated_at?: string;
  source_fingerprint?: string;
  error?: string;
};

type VaultRecordsResponse = {
  ok: boolean;
  records?: ImportMemoriesRequest["payload"]["records"];
  offset?: number;
  next_offset?: number;
  total?: number;
  done?: boolean;
  generated_at?: string;
  source_fingerprint?: string;
  error?: string;
};

function sendNativeVaultMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(VAULT_NATIVE_HOST, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

function vaultFingerprint(manifest: VaultManifestResponse): string {
  return manifest.source_fingerprint || manifest.generated_at || "unknown";
}

async function handleVaultNativeSync(options: {
  batchSize?: number;
  maxBatches?: number;
  force?: boolean;
} = {}) {
  const batchSize = Math.max(1, options.batchSize || VAULT_BATCH_SIZE);
  const maxBatches = Math.max(1, options.maxBatches || VAULT_MAX_BATCHES_PER_WAKE);
  const manifest = await sendNativeVaultMessage<VaultManifestResponse>({ type: "manifest" });
  if (!manifest?.ok) {
    throw new Error(manifest?.error || "Vault native host manifest failed");
  }

  const fingerprint = vaultFingerprint(manifest);
  const state = await chrome.storage.local.get([
    "vault_native_completed_fingerprint",
    "vault_native_offset",
  ]);
  let offset = Number(state.vault_native_offset || 0);
  const alreadyComplete = state.vault_native_completed_fingerprint === fingerprint && offset === 0;
  if (alreadyComplete && !options.force) {
    return {
      success: true,
      skipped: true,
      fingerprint,
      total: manifest.records || 0,
    };
  }

  let imported = 0;
  let skipped = 0;
  let done = false;
  let lastTotal = manifest.records || 0;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const response = await sendNativeVaultMessage<VaultRecordsResponse>({
      type: "records",
      offset,
      limit: batchSize,
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Vault native host records failed");
    }

    const records = response.records || [];
    lastTotal = response.total || lastTotal;
    if (!records.length) {
      done = true;
      offset = 0;
      break;
    }

    const result = await importMemoryRecords(records);
    imported += result.payload.count;
    skipped += result.payload.skipped || 0;
    offset = response.next_offset ?? (offset + records.length);

    if (response.done) {
      done = true;
      offset = 0;
      break;
    }
  }

  await chrome.storage.local.set({
    vault_native_offset: offset,
    vault_native_last_fingerprint: fingerprint,
    vault_native_last_sync_at: new Date().toISOString(),
    vault_native_last_imported: imported,
    vault_native_last_skipped: skipped,
    vault_native_total_records: lastTotal,
    ...(done ? { vault_native_completed_fingerprint: fingerprint } : {}),
  });

  return {
    success: true,
    imported,
    skipped,
    done,
    nextOffset: offset,
    fingerprint,
    total: lastTotal,
  };
}

function ensureVaultNativeAlarm() {
  chrome.alarms.create(VAULT_SYNC_ALARM, { periodInMinutes: 1 });
}

// ─── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "CAPTURE_MESSAGE":
      handleCaptureMessage(message as CaptureMessage)
        .then(sendResponse)
        .catch((err) => {
          console.error("[AI Memory] Capture handler error:", err);
          sendResponse({ success: false, error: String(err) });
        });
      return true; // keep channel open for async response

    case "QUERY_RECORDS":
      handleQueryRecords(message as QueryRecordsRequest)
        .then(sendResponse)
        .catch(() =>
          sendResponse({
            type: "QUERY_RECORDS_RESPONSE",
            payload: { records: [], total: 0 },
          }),
        );
      return true;

    case "CLEAR_ERRORS":
      handleClearErrors()
        .then(sendResponse)
        .catch(() =>
          sendResponse({
            type: "CLEAR_ERRORS_RESPONSE",
            payload: { success: false },
          }),
        );
      return true;

    case "DELETE_RECORD":
      handleDeleteRecord(message as DeleteRecordRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: "DELETE_RECORD_RESPONSE",
            payload: { success: false, error: String(err) },
          }),
        );
      return true;

    case "CLEAR_ALL_MEMORIES":
      handleClearAllMemories()
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: "CLEAR_ALL_MEMORIES_RESPONSE",
            payload: { success: false, error: String(err) },
          }),
        );
      return true;

    case "UPDATE_CONVERSATION_TITLE":
      handleUpdateConversationTitle(message as UpdateConversationTitleRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: "UPDATE_CONVERSATION_TITLE_RESPONSE",
            payload: { success: false, error: String(err) },
          }),
        );
      return true;

    case "GET_CONVERSATION_TITLES":
      handleGetConversationTitles(message as GetConversationTitlesRequest)
        .then(sendResponse)
        .catch(() =>
          sendResponse({
            type: "GET_CONVERSATION_TITLES_RESPONSE",
            payload: { titles: {} },
          }),
        );
      return true;

    case "SEARCH_MEMORIES": {
      const query = (message.payload as { query?: string })?.query ?? "";
      const timeoutMs = 90_000; // 90s for first-time model load
      let responded = false;
      const safeSend = (resp: unknown) => {
        if (responded) return;
        responded = true;
        sendResponse(resp);
      };
      const timeoutId = setTimeout(
        () =>
          safeSend({
            type: "SEARCH_MEMORIES_RESPONSE",
            payload: {
              results: [],
              query,
              error: "Search timed out (embedding may still be loading)",
            },
          }),
        timeoutMs,
      );
      handleSearchMemories(message as SearchMemoriesRequest, embedViaOffscreen)
        .then((resp) => {
          clearTimeout(timeoutId);
          safeSend(resp);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.warn("[AI Memory] Search failed:", err);
          safeSend({
            type: "SEARCH_MEMORIES_RESPONSE",
            payload: { results: [], query, error: String(err) },
          });
        });
      return true;
    }

    case "EXPORT_MEMORIES":
      handleExportMemories()
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: "EXPORT_MEMORIES_RESPONSE",
            payload: {
              envelope: { metadata: {} as never, payload: [] },
              error: String(err),
            },
          }),
        );
      return true;

    case "IMPORT_MEMORIES":
      handleImportMemories(message as ImportMemoriesRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: "IMPORT_MEMORIES_RESPONSE",
            payload: { success: false, count: 0, error: String(err) },
          }),
        );
      return true;

    case "SYNC_VAULT_NATIVE":
      handleVaultNativeSync({ force: true, maxBatches: 100 })
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            success: false,
            error: String(err),
          }),
        );
      return true;

    case "DOM_SYNC":
      handleDomSync(message as DomSyncRequest, () => {
        lastCaptureTime = Date.now();
        void broadcastStatusUpdate();
      })
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: "DOM_SYNC_RESPONSE",
            payload: { queued: 0, skipped: 0, error: String(err) },
          }),
        );
      return true;

    case "FIRST_RECALL_USED":
      // Forward to onboarding via storage so all extension contexts can react
      chrome.storage.local.set({ onboarding_first_recall_used: true })
      sendResponse({ success: true })
      return false

    default:
      break;
  }
});

// Periodic status broadcast — disabled for now, re-enable if needed
// setInterval(() => void broadcastStatusUpdate(), 30_000)

// ─── MAIN world injection for fetch/XHR interception ───────────────────────────

const AI_ORIGINS = [
  "https://chat.openai.com",
  "https://chatgpt.com",
  "https://claude.ai",
  "https://gemini.google.com",
  "https://www.perplexity.ai",
  "https://grok.com",
];

function injectMainWorld(tabId: number): void {
  chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: mainWorldInterceptor,
    })
    .then(() => {})
    .catch((err) => {
      console.warn("[AI Memory] Injection failed for tab", tabId, err);
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const status = changeInfo.status;
  const url = tab.url ?? "";
  if (!url || !AI_ORIGINS.some((o) => url.startsWith(o))) return;
  // Inject on 'loading' so our fetch wrapper is in place before the page's scripts run (critical for Gemini).
  // Also inject on 'complete' to catch SPAs that may have replaced fetch after initial load.
  if (status === "loading" || status === "complete") {
    injectMainWorld(tabId);
  }
  // Fallback: proactively fetch Perplexity thread history from the background SW
  // in case the page's JS fails to run (e.g. Cloudflare Access blocking static files).
  if (status === "complete" && url.includes("www.perplexity.ai/search/")) {
    void maybeFetchPerplexityThreadHistory(url, handleCaptureMessage);
  }
});

// Open onboarding tab on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  ensureVaultNativeAlarm();
  if (details.reason === 'install') {
    const { onboarding_completed } = await chrome.storage.local.get('onboarding_completed')
    if (!onboarding_completed) {
      chrome.tabs.create({ url: chrome.runtime.getURL('tabs/onboarding.html') })
    }
  }
  setTimeout(() => {
    void handleVaultNativeSync({ maxBatches: VAULT_MAX_BATCHES_PER_WAKE }).catch((err) => {
      console.warn("[AI Memory] Vault native sync failed:", err);
    });
  }, 3000);
})

// Inject into already-open AI tabs when extension loads (e.g. user had ChatGPT
// open before installing or reloading the extension).
if (typeof chrome.runtime.onStartup !== "undefined") {
  chrome.runtime.onStartup.addListener(() => {
    ensureVaultNativeAlarm();
    injectIntoAITabs();
    void handleVaultNativeSync({ maxBatches: VAULT_MAX_BATCHES_PER_WAKE }).catch((err) => {
      console.warn("[AI Memory] Vault native startup sync failed:", err);
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== VAULT_SYNC_ALARM) return;
  void handleVaultNativeSync({ maxBatches: VAULT_MAX_BATCHES_PER_WAKE }).catch((err) => {
    console.warn("[AI Memory] Vault native alarm sync failed:", err);
  });
});

ensureVaultNativeAlarm();

// Inject into already-open AI tabs when this script loads (e.g. after install/reload).
injectIntoAITabs();

function injectIntoAITabs(): void {
  chrome.tabs.query({ url: AI_ORIGINS.map((o) => `${o}/*`) }, (tabs) => {
    try {
      for (const tab of tabs) {
        if (tab.id) injectMainWorld(tab.id);
      }
    } catch {
      // Extension context invalidated (e.g. extension was reloaded before callback ran)
    }
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  const tabId = tab.id;
  const tabUrl = tab.url ?? "";

  const isAISite = AI_ORIGINS.some((o) => tabUrl.startsWith(o));

  if (isAISite) {
    // AI site: content script already injected, just open the panel
    chrome.tabs.sendMessage(tabId, { type: "OPEN_MEMORY_PANEL" }).catch(() => void 0);
  } else {
    // Non-AI site: find the hashed memory-float-ui filename from manifest, inject it
    const manifest = chrome.runtime.getManifest();
    const floatScript = (manifest.content_scripts ?? [])
      .flatMap((cs) => cs.js ?? [])
      .find((f) => f.includes("memory-float-ui"));

    if (!floatScript) return;

    chrome.scripting
      .executeScript({
        target: { tabId },
        files: [floatScript],
      })
      .then(() => {
        // Small delay to allow React to mount before opening panel
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { type: "OPEN_MEMORY_PANEL" }).catch(() => void 0);
        }, 300);
      })
      .catch(() => void 0);
  }
});

// Rebuild MiniSearch keyword index from Dexie on every Service Worker startup.
// The SW can be suspended and revived at any time; in-memory state is wiped on each wake.
void hydrateSearchIndex();

// Retry any records that failed to embed during a previous session (e.g. offscreen
// document wasn't ready when the capture came in). Delay slightly so the offscreen
// document has time to spin up before we hit it with a batch.
setTimeout(() => {
  void processPendingEmbeddings();
}, 8000);

// ─── Dev Helper: test SEARCH_MEMORIES from Background console ─────────────────
// Run testSearch('關鍵字', 5) in Service Worker console.
// Uses direct handler call to avoid "Receiving end does not exist" when
// sendMessage is used from SW to itself. First run may take 20–30s (model load).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).testSearch = async (q = "test", k = 5) => {
  try {
    const resp = await handleSearchMemories(
      {
        type: "SEARCH_MEMORIES",
        payload: { query: q, topK: k },
      } as SearchMemoriesRequest,
      embedViaOffscreen,
    );
  } catch (err) {
    console.error("[AI Memory] Search error:", err);
  }
};
