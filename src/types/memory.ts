export type MessageRole = 'user' | 'assistant'

export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface MemoryRecord {
  // Primary Key
  id: string

  // Message Content
  role: MessageRole
  content: string

  // Provider & Context
  provider: AIProvider
  sessionId: string
  /** Optional parent message/thread id (e.g. ChatGPT parent_message_id) */
  parentMessageId?: string
  model?: string

  // Temporal Metadata
  timestamp: number
  createdAt: number

  // Chunking (for long content split into overlapping segments)
  /** 0-based position of this chunk within its logical message. Absent on single-chunk records. */
  chunkIndex?: number
  /** ID of the original logical message this chunk belongs to. Absent on single-chunk records. */
  parentId?: string

  // Semantic Vector
  embedding?: Float32Array

  // Embedding Metadata
  embeddingModel?: string
  embeddingVersion?: string
  hasEmbedding?: number

  // Status Flags
  isPartial: boolean
  isDeleted: boolean
  /** True if this record has been superseded by a newer edit of the same parentMessageId */
  isSuperseded: boolean

  // Optional Metadata
  metadata?: Record<string, unknown>
}

// ─── Memory Export Protocol v1.0 / v1.1 ───────────────────────────────────────

/** Serialised record: embedding is number[] instead of Float32Array for JSON. */
export type SerializableMemoryRecord = Omit<MemoryRecord, 'embedding'> & {
  embedding?: number[]
}

/** A saved favourite prompt (persisted in chrome.storage.local). */
export interface FavoritePrompt {
  id: string
  text: string
  createdAt: number
}

/** A folder that organizes prompts. A prompt can be in multiple folders. */
export interface PromptFolder {
  id: string
  name: string
  promptIds: string[]
  createdAt: number
}

export interface MemoryExportMetadata {
  app: 'PersonalAIMemoryLayer'
  version: '1.0' | '1.1' | '1.2'
  exportedAt: string   // ISO 8601
  recordCount: number
  embeddingModel: string
}

export interface IMemoryExportEnvelope {
  metadata: MemoryExportMetadata
  payload: SerializableMemoryRecord[]
  /** v1.1+: favourite prompts from chrome.storage.local */
  prompts?: FavoritePrompt[]
  /** v1.2+: prompt folders from chrome.storage.local */
  folders?: PromptFolder[]
}

export interface ErrorLog {
  id?: number
  timestamp: number
  message: string
  context?: Record<string, unknown>
}

export interface ConversationTitle {
  /** Primary key: sessionId (format: provider:conversationId) */
  sessionId: string
  /** Title extracted from page <title> element */
  title: string
  /** When the title was captured/updated */
  updatedAt: number
}
