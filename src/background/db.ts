import Dexie, { type Table } from 'dexie'
import type { ConversationTitle, ErrorLog, MemoryRecord } from '../types/memory'

export class MemoryDatabase extends Dexie {
  memories!: Table<MemoryRecord, string>
  errors!: Table<ErrorLog, number>
  conversations!: Table<ConversationTitle, string>

  constructor() {
    super('AIMemoryDB')


    // v1: adds parentId index to support chunk → parent queries
    this.version(1).stores({
      memories:
        'id, sessionId, provider, timestamp, createdAt, parentId, hasEmbedding, [provider+sessionId], [provider+timestamp]',
      errors: '++id, timestamp',
      conversations: 'sessionId, updatedAt',
    })
  }

  // ─── Memory Record DAO ──────────────────────────────────────────────────────

  async addRecord(record: MemoryRecord): Promise<string> {
    const recordToSave = {
      ...record,
      hasEmbedding: (record.embedding && record.embedding.length > 0) ? 1 : 0
    }
    return (await this.memories.add(recordToSave as MemoryRecord)) as string
  }

  async updateEmbedding(
    id: string,
    embedding: Float32Array,
    model: string,
    version: string
  ): Promise<void> {
    await this.memories.update(id, {
      embedding,
      embeddingModel: model,
      embeddingVersion: version,
      hasEmbedding: 1,
    })
  }

  async getPendingEmbeddings(limit = 50): Promise<MemoryRecord[]> {
    return this.memories
      .where('hasEmbedding').equals(0)
      .filter((r) => !r.isDeleted)
      .limit(limit)
      .toArray()
  }

  /** Soft-delete a record (sets isDeleted = true). */
  async softDeleteRecord(id: string): Promise<void> {
    await this.memories.update(id, { isDeleted: true })
  }

  /** Hard-delete all memory records and conversation titles from the DB. */
  async clearAllMemories(): Promise<void> {
    await this.memories.clear()
    await this.conversations.clear()
  }

  /** Returns the most recent non-deleted records by createdAt (desc). */
  async getRecent(limit = 10): Promise<MemoryRecord[]> {
    return this.memories
      .orderBy('createdAt')
      .reverse()
      .limit(Math.max(limit * 3, 50))
      .toArray()
      .then((records) => records.filter((r) => !r.isDeleted).slice(0, limit))
  }

  async countTotal(): Promise<number> {
    return this.memories.filter((r) => !r.isDeleted).count()
  }

  async queryRecords(filters?: {
    provider?: MemoryRecord['provider']
    sessionId?: string
    startTime?: number
    endTime?: number
    limit?: number
  }): Promise<{ records: MemoryRecord[]; total: number }> {
    let collection = this.memories.filter((r) => !r.isDeleted)

    if (filters?.provider) {
      collection = this.memories
        .where('provider')
        .equals(filters.provider)
        .filter((r) => !r.isDeleted)
    }

    if (filters?.sessionId) {
      collection = this.memories
        .where('sessionId')
        .equals(filters.sessionId)
        .filter((r) => !r.isDeleted)
    }

    const all = await collection.sortBy('timestamp')
    const filtered = all.filter((r) => {
      if (filters?.startTime && r.timestamp < filters.startTime) return false
      if (filters?.endTime && r.timestamp > filters.endTime) return false
      return true
    })

    const limit = filters?.limit ?? 50
    return {
      records: filtered.slice(0, limit),
      total: filtered.length,
    }
  }

  // ─── Error Log DAO ──────────────────────────────────────────────────────────

  async logError(message: string, context?: Record<string, unknown>): Promise<void> {
    try {
      await this.errors.add({ timestamp: Date.now(), message, context })
    } catch {
      // Never throw from error logging
      console.warn('[AI Memory] Failed to log error to DB:', message)
    }
  }

  async getRecentErrors(limit = 20): Promise<ErrorLog[]> {
    return this.errors.orderBy('timestamp').reverse().limit(limit).toArray()
  }

  async clearErrors(): Promise<void> {
    await this.errors.clear()
  }

  // ─── Conversation Title DAO ────────────────────────────────────────────────────

  /** Upsert a conversation title (create or update). */
  async upsertConversationTitle(sessionId: string, title: string): Promise<void> {
    await this.conversations.put({
      sessionId,
      title: title.trim(),
      updatedAt: Date.now(),
    })
  }

  /** Get title for a specific sessionId. */
  async getConversationTitle(sessionId: string): Promise<string | undefined> {
    const conv = await this.conversations.get(sessionId)
    return conv?.title
  }

  /** Get titles for multiple sessionIds. Returns a Map<sessionId, title>. */
  async getConversationTitles(sessionIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (sessionIds.length === 0) return map

    const convs = await this.conversations.bulkGet(sessionIds)
    for (const conv of convs) {
      if (conv) {
        map.set(conv.sessionId, conv.title)
      }
    }
    return map
  }

  /** Delete a conversation title. */
  async deleteConversationTitle(sessionId: string): Promise<void> {
    await this.conversations.delete(sessionId)
  }

  // ─── DOM Sync Deduplication ─────────────────────────────────────────────────

  /**
   * Checks whether a DOM-sourced message (identified by its ChatGPT messageId)
   * is already stored in IndexedDB.
   *
   * We store DOM messages with id = `dom:${messageId}` so they are distinct
   * from network-captured records (which use UUIDs or provider IDs).
   * Chunk records use `dom:${messageId}-c0` etc., so we only check the parent key.
   */
  async hasMessageId(messageId: string): Promise<boolean> {
    const key = `dom:${messageId}`
    // A single chunk also means the parent was stored — check both.
    const direct = await this.memories.get(key)
    if (direct) return true
    const firstChunk = await this.memories.get(`${key}-c0`)
    return !!firstChunk
  }

  /**
   * Bulk existence check — returns the subset of messageIds NOT yet in the DB.
   * More efficient than calling hasMessageId() in a loop when dealing with
   * potentially dozens of DOM messages on first page load.
   */
  async filterNewMessageIds(messageIds: string[]): Promise<string[]> {
    if (messageIds.length === 0) return []
    const keys = messageIds.flatMap((mid) => [`dom:${mid}`, `dom:${mid}-c0`])
    const existing = await this.memories.bulkGet(keys)
    const foundSet = new Set<string>()
    for (let i = 0; i < messageIds.length; i++) {
      // each messageId maps to indices [i*2, i*2+1] in the bulkGet result
      if (existing[i * 2] || existing[i * 2 + 1]) {
        foundSet.add(messageIds[i])
      }
    }
    return messageIds.filter((mid) => !foundSet.has(mid))
  }
}

// Singleton instance shared across background service worker
export const db = new MemoryDatabase()

// ─── Storage Quota Handling ───────────────────────────────────────────────────

let _captureEnabled = true
let _quotaExceeded = false

export function isCaptureEnabled(): boolean {
  return _captureEnabled
}

export function isQuotaExceeded(): boolean {
  return _quotaExceeded
}

/**
 * Wraps db.addRecord with quota exceeded detection.
 * On QuotaExceededError, disables capture and logs the event.
 */
export async function safeAddRecord(record: MemoryRecord): Promise<string | null> {
  if (!_captureEnabled) return null

  try {
    return await db.addRecord(record)
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')

    if (isQuota) {
      _captureEnabled = false
      _quotaExceeded = true
      await db.logError('QUOTA_EXCEEDED', { recordId: record.id })
      console.warn('[AI Memory] IndexedDB quota exceeded — capture disabled')
    } else {
      await db.logError('ADD_RECORD_FAILED', {
        recordId: record.id,
        error: String(err),
      })
    }
    return null
  }
}


export const memoryDB = new MemoryDatabase()
