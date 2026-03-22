import type { AIProvider, ErrorLog, FavoritePrompt, IMemoryExportEnvelope, MemoryRecord, PromptFolder, SerializableMemoryRecord } from './memory'

// ─── CAPTURE_MESSAGE ─────────────────────────────────────────────────────────
// Direction: Content Script → Background Service Worker

export interface CaptureMessage {
  type: 'CAPTURE_MESSAGE'
  payload: {
    provider: AIProvider
    rawData: unknown
    url: string
    timestamp: number
  }
}

export interface CaptureMessageResponse {
  success: boolean
  recordId?: string
  error?: string
}

// ─── EMBED_REQUEST / EMBED_RESPONSE ──────────────────────────────────────────
// Direction: Background → Embedding Engine (internal)

export interface EmbedRequest {
  type: 'EMBED_REQUEST'
  payload: {
    text: string
    recordId: string
  }
}

export interface EmbedResponse {
  type: 'EMBED_RESPONSE'
  payload: {
    recordId: string
    embedding: Float32Array
    model: string
    success: boolean
    error?: string
  }
}

// ─── EMBED_BATCH ──────────────────────────────────────────────────────────────
// Direction: Background Service Worker → Offscreen Document (internal)
// Batches N texts into a single IPC round-trip for bulk import efficiency.

export interface EmbedBatchRequest {
  type: 'EMBED_BATCH'
  payload: { texts: string[] }
}

// ─── STATUS_UPDATE ────────────────────────────────────────────────────────────
// Direction: Background → Popup UI

export interface StatusUpdate {
  type: 'STATUS_UPDATE'
  payload: {
    totalRecords: number
    recentRecords: MemoryRecord[]
    errors: ErrorLog[]
    lastCaptureTime?: number
    quotaExceeded?: boolean
  }
}

// ─── QUERY_RECORDS ────────────────────────────────────────────────────────────
// Direction: Popup → Background

export interface QueryRecordsRequest {
  type: 'QUERY_RECORDS'
  payload: {
    filters?: {
      provider?: AIProvider
      sessionId?: string
      startTime?: number
      endTime?: number
      limit?: number
      offset?: number
    }
  }
}

export interface QueryRecordsResponse {
  type: 'QUERY_RECORDS_RESPONSE'
  payload: {
    records: MemoryRecord[]
    total: number
  }
}

// ─── CLEAR_ERRORS ─────────────────────────────────────────────────────────────
// Direction: Popup → Background

export interface ClearErrorsRequest {
  type: 'CLEAR_ERRORS'
}

export interface ClearErrorsResponse {
  type: 'CLEAR_ERRORS_RESPONSE'
  payload: {
    success: boolean
  }
}

// ─── DELETE_RECORD ────────────────────────────────────────────────────────────
// Direction: Popup → Background

export interface DeleteRecordRequest {
  type: 'DELETE_RECORD'
  payload: { recordId: string }
}

export interface DeleteRecordResponse {
  type: 'DELETE_RECORD_RESPONSE'
  payload: { success: boolean; error?: string }
}

// ─── UPDATE_CONVERSATION_TITLE ────────────────────────────────────────────────
// Direction: Content Script → Background

export interface UpdateConversationTitleRequest {
  type: 'UPDATE_CONVERSATION_TITLE'
  payload: { sessionId: string; title: string }
}

export interface UpdateConversationTitleResponse {
  type: 'UPDATE_CONVERSATION_TITLE_RESPONSE'
  payload: { success: boolean; error?: string }
}

// ─── GET_CONVERSATION_TITLES ───────────────────────────────────────────────────
// Direction: UI → Background

export interface GetConversationTitlesRequest {
  type: 'GET_CONVERSATION_TITLES'
  payload: { sessionIds: string[] }
}

export interface GetConversationTitlesResponse {
  type: 'GET_CONVERSATION_TITLES_RESPONSE'
  payload: { titles: Map<string, string> | Record<string, string> }
}

// ─── OPEN_MEMORY_PANEL ───────────────────────────────────────────────────────
// Direction: Background → Content Script

export interface OpenMemoryPanel {
  type: 'OPEN_MEMORY_PANEL'
}

// ─── SEARCH_MEMORIES ──────────────────────────────────────────────────────────
// Direction: UI → Background

export interface SearchMemoriesRequest {
  type: 'SEARCH_MEMORIES'
  payload: { query: string; topK?: number }
}

/** A single search result. Embedding is intentionally excluded (not JSON-serializable). */
export interface SearchResult {
  id: string
  role: string
  content: string
  sessionId: string
  provider: string
  timestamp: number
  createdAt: number
  parentId?: string
  chunkIndex?: number
  similarityScore: number
}

export interface SearchMemoriesResponse {
  type: 'SEARCH_MEMORIES_RESPONSE'
  payload: { results: SearchResult[]; query: string; error?: string }
}

// ─── EXPORT_MEMORIES ─────────────────────────────────────────────────────────
// Direction: UI (popup / float panel) → Background
// Background reads the DB, serialises embeddings, and returns a v1.0 envelope.

export interface ExportMemoriesRequest {
  type: 'EXPORT_MEMORIES'
}

export interface ExportMemoriesResponse {
  type: 'EXPORT_MEMORIES_RESPONSE'
  payload: {
    envelope: IMemoryExportEnvelope
    error?: string
  }
}

// ─── IMPORT_MEMORIES ─────────────────────────────────────────────────────────
// Direction: UI (popup / float panel) → Background
// UI parses and validates the file; background restores embeddings and persists.

export interface ImportMemoriesRequest {
  type: 'IMPORT_MEMORIES'
  payload: {
    records: SerializableMemoryRecord[]
    prompts?: FavoritePrompt[]
    folders?: PromptFolder[]
  }
}

export interface ImportMemoriesResponse {
  type: 'IMPORT_MEMORIES_RESPONSE'
  payload: {
    success: boolean
    count: number
    error?: string
  }
}

// ─── CLEAR_ALL_MEMORIES ───────────────────────────────────────────────────────
// Direction: Popup → Background

export interface ClearAllMemoriesRequest {
  type: 'CLEAR_ALL_MEMORIES'
}

export interface ClearAllMemoriesResponse {
  type: 'CLEAR_ALL_MEMORIES_RESPONSE'
  payload: { success: boolean; error?: string }
}

// ─── DOM_SYNC ─────────────────────────────────────────────────────────────────
// Direction: Content Script → Background Service Worker
// Triggered once per page-load / SPA-navigation to sync historical messages
// that predate the network interceptor (i.e. messages already in the DOM).
//
// Each DomMessage represents one logical ChatGPT turn discovered via DOM scan.
// The background deduplicates against IndexedDB before queuing embeddings.

export interface DomMessage {
  /** data-message-id attribute from the DOM bubble */
  messageId: string
  /** 'user' or 'assistant' inferred from turn structure */
  role: 'user' | 'assistant'
  /** Visible text content of the bubble */
  content: string
  /** conversation-turn index (data-testid="conversation-turn-N") */
  turnIndex: number
  /** ChatGPT conversation ID extracted from window.location or DOM */
  sessionId: string
  /** Page <title> at scan time — used as conversation label */
  pageTitle: string
  /** Unix ms timestamp when the scan ran */
  scannedAt: number
}

export interface DomSyncRequest {
  type: 'DOM_SYNC'
  payload: {
    messages: DomMessage[]
    provider: 'openai'
    url: string
  }
}

export interface DomSyncResponse {
  type: 'DOM_SYNC_RESPONSE'
  payload: {
    /** Number of genuinely new messages queued for embedding */
    queued: number
    /** Number of messages already in DB (skipped) */
    skipped: number
    error?: string
  }
}

// ─── Union Types ──────────────────────────────────────────────────────────────

export type ExtensionMessage =
  | CaptureMessage
  | EmbedRequest
  | EmbedResponse
  | EmbedBatchRequest
  | StatusUpdate
  | QueryRecordsRequest
  | QueryRecordsResponse
  | ClearErrorsRequest
  | ClearErrorsResponse
  | DeleteRecordRequest
  | DeleteRecordResponse
  | ClearAllMemoriesRequest
  | ClearAllMemoriesResponse
  | UpdateConversationTitleRequest
  | UpdateConversationTitleResponse
  | GetConversationTitlesRequest
  | GetConversationTitlesResponse
  | OpenMemoryPanel
  | SearchMemoriesRequest
  | SearchMemoriesResponse
  | ExportMemoriesRequest
  | ExportMemoriesResponse
  | ImportMemoriesRequest
  | ImportMemoriesResponse
  | DomSyncRequest
  | DomSyncResponse

export type ExtensionMessageResponse =
  | CaptureMessageResponse
  | EmbedResponse
  | QueryRecordsResponse
  | ClearErrorsResponse
  | DeleteRecordResponse
  | ClearAllMemoriesResponse
  | UpdateConversationTitleResponse
  | GetConversationTitlesResponse
  | SearchMemoriesResponse
  | ExportMemoriesResponse
  | ImportMemoriesResponse
  | DomSyncResponse
