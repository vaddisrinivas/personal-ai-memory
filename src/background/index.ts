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

import { mainWorldInterceptor } from './injector'
import { MODEL_NAME, EMBEDDING_VERSION } from './embedding'
import { ChatGPTAdapter } from './adapters/chatgpt'
import { ClaudeAdapter } from './adapters/claude'
import { GeminiAdapter } from './adapters/gemini'
import type { IAdapter } from './adapters/base'
import { db, isCaptureEnabled, isQuotaExceeded, safeAddRecord } from './db'
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
  DomSyncResponse,
} from '../types/messages'
import { handleSearchMemories, hydrateSearchIndex, miniSearch } from './search'
import type { MemoryRecord } from '../types/memory'
import {
  FAVORITE_PROMPTS_KEY,
  FOLDERS_STORAGE_KEY,
} from '../constants/prompts'
import { processPendingEmbeddings } from './syncEmbeddings'

// Embedding runs in an Offscreen Document (full DOM context) via Chrome's
// chrome.offscreen API, avoiding the MV3 Service Worker WASM/DOM limitations.
const SKIP_EMBEDDING_FOR_TEST = false

// ─── Adapter Registry ─────────────────────────────────────────────────────────

const adapters: IAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
]

function findAdapter(url: string): IAdapter | undefined {
  return adapters.find((a) => a.canHandle(url))
}

// ─── Chunking ─────────────────────────────────────────────────────────────────
// paraphrase-multilingual-MiniLM-L12-v2 has a ~128-token context window.
// We split long content into overlapping character windows so each chunk fits
// comfortably. Overlap preserves cross-boundary context for better retrieval.

const CHUNK_SIZE_CHARS = 500   // ~100-125 tokens for mixed Chinese/English
const CHUNK_OVERLAP_CHARS = 75 // ~15% overlap to avoid cutting mid-sentence

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE_CHARS) return [text]

  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + CHUNK_SIZE_CHARS))
    i += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS
  }
  return chunks
}

/**
 * Expands a single MemoryRecord into one or more chunk records.
 * Short content (≤ CHUNK_SIZE_CHARS) is returned as-is (no extra fields).
 * Long content is split; each chunk gets a unique id, chunkIndex, and parentId.
 */
function expandToChunks(record: MemoryRecord): MemoryRecord[] {
  const chunks = chunkText(record.content)
  if (chunks.length === 1) return [record]

  return chunks.map((content, i) => ({
    ...record,
    id: `${record.id}-c${i}`,
    content,
    chunkIndex: i,
    parentId: record.id,
  }))
}

// ─── Capture Handler ──────────────────────────────────────────────────────────

async function handleCaptureMessage(
  message: CaptureMessage
): Promise<CaptureMessageResponse> {
  const { provider, rawData, url, timestamp } = message.payload

  if (!isCaptureEnabled()) {
    console.warn('[AI Memory] Capture skipped: QUOTA_EXCEEDED')
    return { success: false, error: 'QUOTA_EXCEEDED' }
  }

  const adapter = findAdapter(url)
  if (!adapter) {
    console.warn('[AI Memory] No adapter for URL:', url)
    return { success: false, error: `No adapter for URL: ${url}` }
  }

  let records: MemoryRecord[]
  try {
    records = adapter.parse(rawData, url, timestamp)
  } catch (err) {
    console.warn('[AI Memory] Adapter parse failed:', url, err)
    await db.logError('ADAPTER_PARSE_FAILED', { url, provider, error: String(err) })
    return { success: false, error: 'Parse failed' }
  }

  if (!records.length) {
    console.warn('[AI Memory] No records extracted from:', url)
    return { success: false, error: 'No records extracted' }
  }

  const ids: string[] = []
  for (const record of records) {
    for (const chunk of expandToChunks(record)) {
      const id = await safeAddRecord(chunk)
      if (id) {
        ids.push(id)
        const preview = chunk.content.slice(0, 50) + (chunk.content.length > 50 ? '…' : '')
        const chunkLabel = chunk.chunkIndex !== undefined ? ` [chunk ${chunk.chunkIndex}]` : ''
        // Keep MiniSearch in sync with Dexie
        try { miniSearch.add(chunk) } catch { /* duplicate id — already indexed */ }
        if (!SKIP_EMBEDDING_FOR_TEST) {
          queueEmbedding(chunk)
        }
      }
    }
  }

  lastCaptureTime = Date.now()
  broadcastStatusUpdate()

  return { success: true, recordId: ids[0] }
}

// ─── Offscreen Document Management ───────────────────────────────────────────
// Transformers.js (ONNX/WASM) requires DOM APIs not available in Service Workers.
// We create a hidden offscreen document that has full DOM access, then route
// embedding requests there via chrome.runtime.sendMessage.

const OFFSCREEN_URL = chrome.runtime.getURL('tabs/offscreen.html')
let _creatingOffscreen = false

async function ensureOffscreenDocument(): Promise<void> {
  // chrome.runtime.getContexts is available in Chrome 116+
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
      documentUrls: [OFFSCREEN_URL],
    })
    if (contexts.length > 0) return
  }

  if (_creatingOffscreen) {
    // Wait for an in-progress creation to finish
    await new Promise<void>((resolve) => {
      const poll = setInterval(() => {
        if (!_creatingOffscreen) { clearInterval(poll); resolve() }
      }, 50)
    })
    return
  }

  _creatingOffscreen = true
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['BLOBS' as chrome.offscreen.Reason, 'WORKERS' as chrome.offscreen.Reason],
      justification: 'Run ONNX/WASM text embedding inference for AI Memory',
    })
  } finally {
    _creatingOffscreen = false
  }
}

// Texts longer than 2000 chars exceed all-MiniLM-L6-v2's 512-token context window.
// Truncate before embedding (MVP: simple character truncation).
const MAX_EMBED_CHARS = 2000

export async function embedViaOffscreen(text: string): Promise<Float32Array> {
  await ensureOffscreenDocument()
  const truncated = text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text

  return new Promise<Float32Array>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'EMBED_TEXT', payload: { text: truncated } },
      (response: { success: boolean; embedding?: number[]; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (response?.success && response.embedding) {
          resolve(new Float32Array(response.embedding))
        } else {
          reject(new Error(response?.error ?? 'Embedding failed in offscreen document'))
        }
      }
    )
  })
}

export async function embedBatchViaOffscreen(
  texts: string[]
): Promise<Array<Float32Array | null>> {
  await ensureOffscreenDocument()
  const truncated = texts.map((t) =>
    t.length > MAX_EMBED_CHARS ? t.slice(0, MAX_EMBED_CHARS) : t
  )
  return new Promise<Array<Float32Array | null>>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'EMBED_BATCH', payload: { texts: truncated } },
      (response: {
        success: boolean
        results?: Array<{ success: boolean; embedding?: number[]; error?: string }>
        error?: string
      } | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!response?.success || !response.results) {
          reject(new Error(response?.error ?? 'EMBED_BATCH failed'))
          return
        }
        resolve(response.results.map((r) =>
          r.success && r.embedding ? new Float32Array(r.embedding) : null
        ))
      }
    )
  })
}

// ─── Embedding Queue (US2) ────────────────────────────────────────────────────

function queueEmbedding(record: MemoryRecord): void {
  embedViaOffscreen(record.content)
    .then((embedding) =>
      db.updateEmbedding(record.id, embedding, MODEL_NAME, EMBEDDING_VERSION)
    )
    .catch((err) => {
      // Model unavailable or offscreen error — record remains without embedding
      console.warn('[AI Memory] Embedding failed for record', record.id, err)
      void db.logError('EMBEDDING_FAILED', { recordId: record.id, error: String(err) })
    })
}

// ─── Status Broadcast ─────────────────────────────────────────────────────────

let lastCaptureTime: number | undefined

async function broadcastStatusUpdate(): Promise<void> {
  try {
    const [totalRecords, recentRecords, errors] = await Promise.all([
      db.countTotal(),
      db.getRecent(10),
      db.getRecentErrors(5),
    ])

    const payload: StatusUpdate = {
      type: 'STATUS_UPDATE',
      payload: {
        totalRecords,
        recentRecords,
        errors,
        lastCaptureTime,
        quotaExceeded: isQuotaExceeded(),
      },
    }

    chrome.runtime
      .sendMessage(payload)
      .catch(() => void 0) // popup may be closed — ignore
  } catch {
    // Status broadcast is best-effort
  }
}

// ─── QUERY_RECORDS Handler ────────────────────────────────────────────────────

async function handleQueryRecords(
  message: QueryRecordsRequest
): Promise<QueryRecordsResponse> {
  const { records, total } = await db.queryRecords(message.payload.filters)
  return {
    type: 'QUERY_RECORDS_RESPONSE',
    payload: { records, total },
  }
}

// ─── CLEAR_ERRORS Handler ─────────────────────────────────────────────────────

async function handleClearErrors(): Promise<ClearErrorsResponse> {
  await db.clearErrors()
  return { type: 'CLEAR_ERRORS_RESPONSE', payload: { success: true } }
}

// ─── DELETE_RECORD Handler ─────────────────────────────────────────────────────

async function handleDeleteRecord(
  message: DeleteRecordRequest
): Promise<DeleteRecordResponse> {
  try {
    await db.softDeleteRecord(message.payload.recordId)
    return { type: 'DELETE_RECORD_RESPONSE', payload: { success: true } }
  } catch (err) {
    return {
      type: 'DELETE_RECORD_RESPONSE',
      payload: { success: false, error: String(err) },
    }
  }
}

// ─── CLEAR_ALL_MEMORIES Handler ───────────────────────────────────────────────

async function handleClearAllMemories(): Promise<ClearAllMemoriesResponse> {
  try {
    await db.clearAllMemories()
    // Also reset the in-memory MiniSearch index
    miniSearch.removeAll()
    lastCaptureTime = undefined
    void broadcastStatusUpdate()
    return { type: 'CLEAR_ALL_MEMORIES_RESPONSE', payload: { success: true } }
  } catch (err) {
    return {
      type: 'CLEAR_ALL_MEMORIES_RESPONSE',
      payload: { success: false, error: String(err) },
    }
  }
}

async function handleUpdateConversationTitle(
  message: UpdateConversationTitleRequest
): Promise<UpdateConversationTitleResponse> {
  try {
    await db.upsertConversationTitle(message.payload.sessionId, message.payload.title)
    return { type: 'UPDATE_CONVERSATION_TITLE_RESPONSE', payload: { success: true } }
  } catch (err) {
    return {
      type: 'UPDATE_CONVERSATION_TITLE_RESPONSE',
      payload: { success: false, error: String(err) },
    }
  }
}

async function handleGetConversationTitles(
  message: GetConversationTitlesRequest
): Promise<GetConversationTitlesResponse> {
  try {
    const titlesMap = await db.getConversationTitles(message.payload.sessionIds)
    // Convert Map to Record for JSON serialization
    const titlesRecord: Record<string, string> = {}
    titlesMap.forEach((title, sessionId) => {
      titlesRecord[sessionId] = title
    })
    return {
      type: 'GET_CONVERSATION_TITLES_RESPONSE',
      payload: { titles: titlesRecord },
    }
  } catch (err) {
    return {
      type: 'GET_CONVERSATION_TITLES_RESPONSE',
      payload: { titles: {} },
    }
  }
}

async function handleExportMemories() {
  try {
    const all = await db.memories.toArray()
    const { [FAVORITE_PROMPTS_KEY]: prompts, [FOLDERS_STORAGE_KEY]: folders } =
      await chrome.storage.local.get([FAVORITE_PROMPTS_KEY, FOLDERS_STORAGE_KEY])
    const hasPrompts = Array.isArray(prompts) && prompts.length > 0
    const hasFolders = Array.isArray(folders) && folders.length > 0
    const version = hasFolders ? '1.2' : hasPrompts ? '1.1' : '1.0'
    const envelope = {
      metadata: {
        app: 'PersonalAIMemoryLayer' as const,
        version: version as '1.0' | '1.1' | '1.2',
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
    }
    return { type: 'EXPORT_MEMORIES_RESPONSE' as const, payload: { envelope } }
  } catch (err) {
    return {
      type: 'EXPORT_MEMORIES_RESPONSE' as const,
      payload: { envelope: { metadata: {} as never, payload: [] }, error: String(err) },
    }
  }
}

async function handleImportMemories(message: ImportMemoriesRequest) {
  try {
    const records: MemoryRecord[] = message.payload.records.map((r) => ({
      ...r,
      embedding: Array.isArray(r.embedding) ? new Float32Array(r.embedding) : undefined,
      // Set hasEmbedding to 1 if the embedding is not empty
      hasEmbedding: Array.isArray(r.embedding) && r.embedding!.length > 0 ? 1 : 0
    }))
    await db.memories.bulkPut(records)

    // Persist conversation titles extracted from import metadata (e.g. ChatGPT)
    const titleUpdates = new Map<string, string>()
    for (const r of records) {
      const title = (r.metadata as Record<string, string> | undefined)?.conversationTitle
      if (title && r.sessionId && !titleUpdates.has(r.sessionId)) {
        titleUpdates.set(r.sessionId, title)
      }
    }
    for (const [sessionId, title] of titleUpdates) {
      void db.upsertConversationTitle(sessionId, title)
    }

    const prompts = message.payload.prompts
    if (Array.isArray(prompts) && prompts.length > 0) {
      await chrome.storage.local.set({ [FAVORITE_PROMPTS_KEY]: prompts })
    }
    const folders = message.payload.folders
    if (Array.isArray(folders) && folders.length > 0) {
      await chrome.storage.local.set({ [FOLDERS_STORAGE_KEY]: folders })
    }
    // Rebuild keyword index so imported records are immediately searchable
    void hydrateSearchIndex()

    // Process pending embeddings in the background
    void processPendingEmbeddings()
    return {
      type: 'IMPORT_MEMORIES_RESPONSE' as const,
      payload: { success: true, count: records.length },
    }
  } catch (err) {
    return {
      type: 'IMPORT_MEMORIES_RESPONSE' as const,
      payload: { success: false, count: 0, error: String(err) },
    }
  }
}

// ─── DOM Sync Handler ─────────────────────────────────────────────────────────
// Processes historical messages discovered by the DOM scanner in chatgpt-injector.
//
// Safety rules:
//   1. Deduplicate first — never write a record whose id already exists in Dexie.
//   2. Process one record at a time through the embedding queue (avoids WASM OOM).
//   3. Return immediately to the content script with queued/skipped counts so the
//      UI can show a "syncing…" indicator if desired — the actual embedding work
//      continues asynchronously in the background.

/** Serial sync queue — processes DOM-sourced records one-by-one. */
const _syncQueue: (() => Promise<void>)[] = []
let _syncRunning = false

function drainSyncQueue(): void {
  if (_syncRunning || _syncQueue.length === 0) return
  _syncRunning = true

  const next = _syncQueue.shift()!
  next()
    .catch((err) => {
      console.warn('[AI Memory] DOM sync queue error:', err)
    })
    .finally(() => {
      _syncRunning = false
      drainSyncQueue() // process next item
    })
}

function enqueueSyncRecord(record: MemoryRecord): void {
  _syncQueue.push(async () => {
    for (const chunk of expandToChunks(record)) {
      const id = await safeAddRecord(chunk)
      if (id) {
        const preview = chunk.content.slice(0, 50) + (chunk.content.length > 50 ? '…' : '')
        const chunkLabel = chunk.chunkIndex !== undefined ? ` [chunk ${chunk.chunkIndex}]` : ''
        try { miniSearch.add(chunk) } catch { /* duplicate id — already indexed */ }
        if (!SKIP_EMBEDDING_FOR_TEST) {
          queueEmbedding(chunk)
        }
      }
    }
  })
  drainSyncQueue()
}

async function handleDomSync(message: DomSyncRequest): Promise<DomSyncResponse> {
  const { messages, url } = message.payload

  if (!isCaptureEnabled()) {
    return {
      type: 'DOM_SYNC_RESPONSE',
      payload: { queued: 0, skipped: messages.length, error: 'QUOTA_EXCEEDED' },
    }
  }

  if (!messages.length) {
    return { type: 'DOM_SYNC_RESPONSE', payload: { queued: 0, skipped: 0 } }
  }

  // Bulk deduplication — one DB round-trip for all message IDs
  const allIds = messages.map((m) => m.messageId)
  const newIds = new Set(await db.filterNewMessageIds(allIds))

  const newMessages = messages.filter((m) => newIds.has(m.messageId))
  const skipped = messages.length - newMessages.length


  const now = Date.now()
  for (const msg of newMessages) {
    const record: MemoryRecord = {
      id: `dom:${msg.messageId}`,
      role: msg.role,
      content: msg.content,
      provider: 'openai',
      sessionId: msg.sessionId,
      timestamp: msg.scannedAt,   // best approximation — no network timestamp
      createdAt: now,
      isPartial: false,
      isDeleted: false,
      isSuperseded: false,
      metadata: {
        source: 'dom_scan',
        turnIndex: msg.turnIndex,
        pageTitle: msg.pageTitle,
        url,
      },
    }
    enqueueSyncRecord(record)
  }

  // Update the conversation title while we're here (non-blocking)
  if (newMessages.length > 0) {
    const first = newMessages[0]
    if (first.pageTitle && first.sessionId) {
      void db.upsertConversationTitle(first.sessionId, first.pageTitle)
    }
    lastCaptureTime = now
    void broadcastStatusUpdate()
  }

  return {
    type: 'DOM_SYNC_RESPONSE',
    payload: { queued: newMessages.length, skipped },
  }
}

// ─── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'CAPTURE_MESSAGE':
      handleCaptureMessage(message as CaptureMessage)
        .then(sendResponse)
        .catch((err) => {
          console.error('[AI Memory] Capture handler error:', err)
          sendResponse({ success: false, error: String(err) })
        })
      return true // keep channel open for async response

    case 'QUERY_RECORDS':
      handleQueryRecords(message as QueryRecordsRequest)
        .then(sendResponse)
        .catch(() =>
          sendResponse({
            type: 'QUERY_RECORDS_RESPONSE',
            payload: { records: [], total: 0 },
          })
        )
      return true

    case 'CLEAR_ERRORS':
      handleClearErrors()
        .then(sendResponse)
        .catch(() =>
          sendResponse({ type: 'CLEAR_ERRORS_RESPONSE', payload: { success: false } })
        )
      return true

    case 'DELETE_RECORD':
      handleDeleteRecord(message as DeleteRecordRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: 'DELETE_RECORD_RESPONSE',
            payload: { success: false, error: String(err) },
          })
        )
      return true

    case 'CLEAR_ALL_MEMORIES':
      handleClearAllMemories()
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: 'CLEAR_ALL_MEMORIES_RESPONSE',
            payload: { success: false, error: String(err) },
          })
        )
      return true

    case 'UPDATE_CONVERSATION_TITLE':
      handleUpdateConversationTitle(message as UpdateConversationTitleRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: 'UPDATE_CONVERSATION_TITLE_RESPONSE',
            payload: { success: false, error: String(err) },
          })
        )
      return true

    case 'GET_CONVERSATION_TITLES':
      handleGetConversationTitles(message as GetConversationTitlesRequest)
        .then(sendResponse)
        .catch(() =>
          sendResponse({
            type: 'GET_CONVERSATION_TITLES_RESPONSE',
            payload: { titles: {} },
          })
        )
      return true

    case 'SEARCH_MEMORIES': {
      const query = (message.payload as { query?: string })?.query ?? ''
      const timeoutMs = 90_000 // 90s for first-time model load
      let responded = false
      const safeSend = (resp: unknown) => {
        if (responded) return
        responded = true
        sendResponse(resp)
      }
      const timeoutId = setTimeout(
        () =>
          safeSend({
            type: 'SEARCH_MEMORIES_RESPONSE',
            payload: { results: [], query, error: 'Search timed out (embedding may still be loading)' },
          }),
        timeoutMs
      )
      handleSearchMemories(message as SearchMemoriesRequest, embedViaOffscreen)
        .then((resp) => {
          clearTimeout(timeoutId)
          safeSend(resp)
        })
        .catch((err) => {
          clearTimeout(timeoutId)
          console.warn('[AI Memory] Search failed:', err)
          safeSend({
            type: 'SEARCH_MEMORIES_RESPONSE',
            payload: { results: [], query, error: String(err) },
          })
        })
      return true
    }

    case 'EXPORT_MEMORIES':
      handleExportMemories()
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: 'EXPORT_MEMORIES_RESPONSE',
            payload: { envelope: { metadata: {} as never, payload: [] }, error: String(err) },
          })
        )
      return true

    case 'IMPORT_MEMORIES':
      handleImportMemories(message as ImportMemoriesRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: 'IMPORT_MEMORIES_RESPONSE',
            payload: { success: false, count: 0, error: String(err) },
          })
        )
      return true

    case 'DOM_SYNC':
      handleDomSync(message as DomSyncRequest)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            type: 'DOM_SYNC_RESPONSE',
            payload: { queued: 0, skipped: 0, error: String(err) },
          })
        )
      return true

    default:
      break
  }
})

// Periodic status broadcast every 30 seconds to keep popup in sync
setInterval(() => void broadcastStatusUpdate(), 30_000)

// ─── MAIN world injection for fetch/XHR interception ───────────────────────────

const AI_ORIGINS = [
  'https://chat.openai.com',
  'https://chatgpt.com',
  'https://claude.ai',
  'https://gemini.google.com',
]

function injectMainWorld(tabId: number): void {
  chrome.scripting
    .executeScript({
      target: { tabId },
      world: 'MAIN',
      func: mainWorldInterceptor,
    })
    .then(() => {
    })
    .catch((err) => {
      console.warn('[AI Memory] Injection failed for tab', tabId, err)
    })
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const status = changeInfo.status
  const url = tab.url ?? ''
  if (!url || !AI_ORIGINS.some((o) => url.startsWith(o))) return
  // Inject on 'loading' so our fetch wrapper is in place before the page's scripts run (critical for Gemini).
  // Also inject on 'complete' to catch SPAs that may have replaced fetch after initial load.
  if (status === 'loading' || status === 'complete') {
    injectMainWorld(tabId)
  }
})

// Inject into already-open AI tabs when extension loads (e.g. user had ChatGPT
// open before installing or reloading the extension).
if (typeof chrome.runtime.onStartup !== 'undefined') {
  chrome.runtime.onStartup.addListener(() => {
    injectIntoAITabs()
  })
}

// Inject into already-open AI tabs when this script loads (e.g. after install/reload).
injectIntoAITabs()

function injectIntoAITabs(): void {
  chrome.tabs.query({ url: AI_ORIGINS.map((o) => `${o}/*`) }, (tabs) => {
    try {
      for (const tab of tabs) {
        if (tab.id) injectMainWorld(tab.id)
      }
    } catch {
      // Extension context invalidated (e.g. extension was reloaded before callback ran)
    }
  })
}

const AI_ORIGINS_FOR_PANEL = [
  'https://chat.openai.com',
  'https://chatgpt.com',
  'https://claude.ai',
  'https://gemini.google.com',
]

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !tab.url) return
  const isAISite = AI_ORIGINS_FOR_PANEL.some((o) => tab.url!.startsWith(o))
  if (isAISite) {
    chrome.tabs.sendMessage(tab.id, { type: 'OPEN_MEMORY_PANEL' }).catch(() => {
      // Content script may not be loaded yet (e.g. tab just opened)
    })
  } else {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 400,
      height: 600,
    }).catch(() => void 0)
  }
})

// Rebuild MiniSearch keyword index from Dexie on every Service Worker startup.
// The SW can be suspended and revived at any time; in-memory state is wiped on each wake.
void hydrateSearchIndex()

// ─── Dev Helper: test SEARCH_MEMORIES from Background console ─────────────────
// Run testSearch('關鍵字', 5) in Service Worker console.
// Uses direct handler call to avoid "Receiving end does not exist" when
// sendMessage is used from SW to itself. First run may take 20–30s (model load).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).testSearch = async (q = 'test', k = 5) => {
  try {
    const resp = await handleSearchMemories(
      { type: 'SEARCH_MEMORIES', payload: { query: q, topK: k } } as SearchMemoriesRequest,
      embedViaOffscreen
    )
  } catch (err) {
    console.error('[AI Memory] Search error:', err)
  }
}
