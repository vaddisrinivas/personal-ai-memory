import type { DomSyncRequest, DomSyncResponse } from "../types/messages";
import type { MemoryRecord } from "../types/memory";
import { expandToChunks } from "./chunking";
import { queueEmbedding } from "./offscreen";
import { safeAddRecord, isCaptureEnabled, db } from "./db";
import { miniSearch } from "./search";
import { normalizeContent } from "./adapters/base";

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
const _syncQueue: (() => Promise<void>)[] = [];
let _syncRunning = false;

function drainSyncQueue(): void {
  if (_syncRunning || _syncQueue.length === 0) return;
  _syncRunning = true;

  const next = _syncQueue.shift()!;
  next()
    .catch((err) => {
      console.warn("[AI Memory] DOM sync queue error:", err);
    })
    .finally(() => {
      _syncRunning = false;
      drainSyncQueue(); // process next item
    });
}

export function enqueueSyncRecord(record: MemoryRecord): void {
  _syncQueue.push(async () => {
    for (const chunk of expandToChunks(record)) {
      const id = await safeAddRecord(chunk);
      if (id) {
        try {
          miniSearch.add(chunk);
        } catch {
          /* duplicate id — already indexed */
        }
        queueEmbedding(chunk);
      }
    }
  });
  drainSyncQueue();
}

export async function handleDomSync(
  message: DomSyncRequest,
  onNewMessages?: () => void,
): Promise<DomSyncResponse> {
  const { messages, url, provider } = message.payload;

  if (!isCaptureEnabled()) {
    return {
      type: "DOM_SYNC_RESPONSE",
      payload: { queued: 0, skipped: messages.length, error: "QUOTA_EXCEEDED" },
    };
  }

  if (!messages.length) {
    return { type: "DOM_SYNC_RESPONSE", payload: { queued: 0, skipped: 0 } };
  }

  // Bulk deduplication — one DB round-trip for all message IDs
  const allIds = messages.map((m) => m.messageId);
  const newIds = new Set(await db.filterNewMessageIds(allIds));

  const newMessages = messages.filter((m) => newIds.has(m.messageId));

  // Gemini migration dedup: existing records may have random XHR-captured UUIDs
  // that ID-based dedup cannot match. Filter by content to prevent duplicates.
  let filteredMessages = newMessages;
  if (provider === 'google' && newMessages.length > 0) {
    const sessionId = newMessages[0].sessionId;
    const existingContent = await db.getSessionContentSet(sessionId);
    if (existingContent.size > 0) {
      filteredMessages = newMessages.filter((m) => !existingContent.has(normalizeContent(m.content)));
    }
  }
  const skipped = messages.length - filteredMessages.length;

  const now = Date.now();
  for (const msg of filteredMessages) {
    const record: MemoryRecord = {
      id: msg.messageId,
      role: msg.role,
      content: msg.content,
      provider,
      sessionId: msg.sessionId,
      timestamp: msg.scannedAt, // best approximation — no network timestamp
      createdAt: now,
      isPartial: false,
      isDeleted: false,
      isSuperseded: false,
      metadata: {
        source: "dom_scan",
        turnIndex: msg.turnIndex,
        pageTitle: msg.pageTitle,
        url,
      },
    };
    enqueueSyncRecord(record);
  }

  // Update the conversation title while we're here (non-blocking)
  if (filteredMessages.length > 0) {
    const first = filteredMessages[0];
    if (first.pageTitle && first.sessionId) {
      void db.upsertConversationTitle(first.sessionId, first.pageTitle);
    }
    onNewMessages?.();

    // Notify onboarding step 2 on first memory saved — DOM sync can beat
    // the network CAPTURE_MESSAGE, so we check here too.
    void chrome.storage.local
      .get(["onboarding_step2_active", "onboarding_first_memory_saved"])
      .then(({ onboarding_step2_active, onboarding_first_memory_saved }) => {
        if (onboarding_step2_active && !onboarding_first_memory_saved) {
          chrome.storage.local.set({ onboarding_first_memory_saved: true });
        }
      });
  }

  return {
    type: "DOM_SYNC_RESPONSE",
    payload: { queued: filteredMessages.length, skipped },
  };
}
