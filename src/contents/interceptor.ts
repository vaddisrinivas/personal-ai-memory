/**
 * Isolated-world content script: forwards MAIN-world capture messages to background.
 *
 * The MAIN world script (injected via chrome.scripting.executeScript) overrides
 * window.fetch and XHR, then sends window.postMessage({ type: '__ai_memory_capture__', payload }).
 * CustomEvent does not cross the MAIN/ISOLATED boundary, so we use postMessage.
 * This script listens for that message and forwards to background via chrome.runtime.sendMessage.
 *
 * Also monitors page title changes and updates conversation titles in the database.
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'https://chat.openai.com/*',
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
}

const POST_TYPE = '__ai_memory_capture__'

/** Returns false if extension context is invalidated (e.g. after reload). */
function isExtensionContextValid(): boolean {
  try {
    void chrome.runtime?.id
    return true
  } catch {
    return false
  }
}

/**
 * Extract sessionId from rawData if available.
 * Format: provider:conversationId
 */
function extractSessionId(payload: {
  provider?: string
  rawData?: unknown
}): string | null {
  if (!payload.provider || !payload.rawData || typeof payload.rawData !== 'object') {
    return null
  }

  const data = payload.rawData as Record<string, unknown>
  const provider = payload.provider

  // Try to extract conversationId from various formats
  let conversationId: string | undefined

  if (provider === 'openai') {
    conversationId =
      (data['conversationId'] as string | undefined) ??
      (data['conversation_id'] as string | undefined)
  } else if (provider === 'anthropic') {
    conversationId = data['id'] as string | undefined
  } else if (provider === 'google') {
    conversationId = data['conversationId'] as string | undefined
  }

  if (conversationId && typeof conversationId === 'string' && conversationId.trim()) {
    return `${provider}:${conversationId.trim()}`
  }

  return null
}

/**
 * Update conversation title from current page title.
 */
function updateConversationTitle(sessionId: string): void {
  if (!isExtensionContextValid()) return

  const title = document.title?.trim()
  if (!title) return

  try {
    chrome.runtime.sendMessage(
      {
        type: 'UPDATE_CONVERSATION_TITLE',
        payload: { sessionId, title },
      },
      () => {
        try {
          void chrome.runtime.lastError
        } catch {
          // Extension context invalidated; ignore
        }
      }
    )
  } catch {
    // Extension context invalidated or sendMessage failed; ignore
  }
}

// Track last sessionId from captures so we can update its title when the page title changes
// (ChatGPT generates the real title asynchronously after the first exchange)
let lastSessionId: string | null = null
let lastTitle = document.title
const titleObserver = new MutationObserver(() => {
  const currentTitle = document.title
  if (currentTitle !== lastTitle && lastSessionId) {
    lastTitle = currentTitle
    updateConversationTitle(lastSessionId)
  }
})

// Start observing title changes
if (document.head) {
  titleObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window) return
  if (e.data?.type === '__ai_memory_injector_ready__') {
    const stage = e.data?.payload?.stage ?? 'unknown'
    return
  }
  if (e.data?.type === '__ai_memory_injector_error__') {
    console.warn('[AI Memory] Injector error:', e.data?.payload ?? e.data)
    return
  }
  if (e.data?.type !== POST_TYPE || !e.data?.payload) return
  const p = e.data.payload
  if (typeof p?.provider !== 'string' || typeof p?.url !== 'string' || typeof p?.timestamp !== 'number') return
  if (!isExtensionContextValid()) return

  try {
    chrome.runtime.sendMessage(
      {
        type: 'CAPTURE_MESSAGE',
        payload: { provider: p.provider, rawData: p.rawData, url: p.url, timestamp: p.timestamp },
      },
      () => {
        try {
          void chrome.runtime.lastError
        } catch {
          // Extension context invalidated in callback; ignore
        }
      }
    )

    // Extract sessionId and update title if available
    const sessionId = extractSessionId({ provider: p.provider, rawData: p.rawData })
    if (sessionId) {
      lastSessionId = sessionId
      updateConversationTitle(sessionId)
    }
  } catch {
    // Extension context invalidated or sendMessage failed; ignore
  }
})
