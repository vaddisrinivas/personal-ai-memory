/**
 * Gemini Recall Button — Content Script
 *
 * Injects a "Recall" button adjacent to the Gemini composer send button.
 * On click, it:
 *   1. Extracts the current editor text as the query.
 *   2. Sends SEARCH_MEMORIES to the background service worker.
 *   3. Formats top-k results as a RAG prompt.
 *   4. Injects the formatted prompt into Gemini's Quill contenteditable editor.
 */

import type { PlasmoCSConfig } from 'plasmo'
import type { SearchMemoriesResponse } from '../types/messages'

export const config: PlasmoCSConfig = {
  matches: ['https://gemini.google.com/*'],
}

const BUTTON_ID = 'ai-memory-gemini-recall-btn'
const INPUT_ID = 'ai-memory-gemini-recall-topk'
const STORAGE_KEY = 'recallTopK'
const DEFAULT_TOP_K = 3

// ─── Text Extraction ──────────────────────────────────────────────────────────
// Gemini uses a Quill-based rich-textarea component with a contenteditable div.

function getInputText(): string {
  // Quill editor inside <rich-textarea>
  const quill = document.querySelector<HTMLElement>('rich-textarea .ql-editor[contenteditable="true"]')
  if (quill) return quill.innerText?.trim() ?? ''

  // Fallback: any visible contenteditable in the input area
  const fallback = document.querySelector<HTMLElement>(
    '.input-area [contenteditable="true"], [data-testid="input-area"] [contenteditable="true"]'
  )
  return fallback?.innerText?.trim() ?? ''
}

// ─── Text Injection ───────────────────────────────────────────────────────────
// Quill intercepts native DOM events. execCommand is the most compatible way
// to inject text while triggering Quill's internal change handlers.

function injectText(text: string): void {
  const quill = document.querySelector<HTMLElement>('rich-textarea .ql-editor[contenteditable="true"]')
  const target =
    quill ??
    document.querySelector<HTMLElement>(
      '.input-area [contenteditable="true"], [data-testid="input-area"] [contenteditable="true"]'
    )

  if (!target) return

  target.focus()
  // Select all existing content then replace it
  document.execCommand('selectAll', false, undefined)
  document.execCommand('insertText', false, text)

  // If execCommand did not fire Quill's handler, dispatch an input event
  target.dispatchEvent(new Event('input', { bubbles: true }))
}

// ─── RAG Prompt Formatter ─────────────────────────────────────────────────────

function formatRAGPrompt(
  query: string,
  results: SearchMemoriesResponse['payload']['results']
): string {
  const memoryBlocks = results
    .map(
      (m, i) =>
        `--- Memory ${i + 1} ---\n` +
        `${m.content}\n` +
        `---------------------`
    )
    .join('\n')

  return (
    '[System Context: The following are relevant memories from our past conversations. Use them as background knowledge for your response.]\n' +
    memoryBlocks +
    '\n[User Query]\n' +
    query
  )
}

// ─── Background Message Bridge ────────────────────────────────────────────────

function getTopK(): number {
  const input = document.getElementById(INPUT_ID) as HTMLInputElement | null
  if (input) {
    const v = parseInt(input.value, 10)
    if (!isNaN(v) && v >= 1) return Math.min(v, 20)
  }
  return DEFAULT_TOP_K
}

function searchMemories(query: string): Promise<SearchMemoriesResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'SEARCH_MEMORIES',
        payload: { query: query || 'general context', topK: getTopK() },
      },
      (resp: SearchMemoriesResponse | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!resp) {
          reject(new Error('No response from background script'))
          return
        }
        resolve(resp)
      }
    )
  })
}

// ─── Button Click Handler ─────────────────────────────────────────────────────

async function handleRecallClick(btn: HTMLButtonElement): Promise<void> {
  const query = getInputText()
  if (!query.trim()) { alert('[AI Memory] Please type your question first, then click Recall.'); return }
  if (query.includes('[System Context: The following are relevant memories')) {
    alert('[AI Memory] Memories already recalled. Clear the text and type your question again to recall fresh memories.')
    return
  }

  btn.textContent = 'Searching...'
  btn.disabled = true

  try {
    const response = await searchMemories(query)
    const results = response.payload.results ?? []

    if (results.length === 0) {
      alert('[AI Memory] No relevant memories found for your query.')
      return
    }

    injectText(formatRAGPrompt(query, results))
  } catch (err) {
    console.error('[AI Memory] Gemini Recall failed:', err)
    alert(`[AI Memory] Search failed: ${String(err)}`)
  } finally {
    btn.textContent = 'Recall'
    btn.disabled = false
  }
}

// ─── Button Creation ──────────────────────────────────────────────────────────

const sharedInputStyle: Partial<CSSStyleDeclaration> = {
  width: '36px',
  padding: '2px 4px',
  borderRadius: '6px',
  border: '1.5px solid currentColor',
  background: 'transparent',
  color: 'inherit',
  fontSize: '13px',
  fontWeight: '500',
  lineHeight: '1.5',
  textAlign: 'center',
  opacity: '0.75',
  outline: 'none',
}

function createRecallButton(): HTMLElement {
  const wrapper = document.createElement('span')
  Object.assign(wrapper.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: '0',
  })

  // topK input
  const input = document.createElement('input')
  input.id = INPUT_ID
  input.type = 'number'
  input.min = '1'
  input.max = '20'
  input.title = 'Number of memories to recall'
  Object.assign(input.style, sharedInputStyle)

  // Load persisted value
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    input.value = String(res[STORAGE_KEY] ?? DEFAULT_TOP_K)
  })

  input.addEventListener('change', () => {
    const v = Math.max(1, Math.min(20, parseInt(input.value, 10) || DEFAULT_TOP_K))
    input.value = String(v)
    chrome.storage.local.set({ [STORAGE_KEY]: v })
  })

  // Prevent Gemini from capturing key events on the input
  input.addEventListener('keydown', (e) => e.stopPropagation())

  const btn = document.createElement('button')
  btn.id = BUTTON_ID
  btn.textContent = 'Recall'
  btn.title = 'Recall past memories and inject as context'
  btn.type = 'button'

  Object.assign(btn.style, {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1.5px solid currentColor',
    background: 'transparent',
    color: 'inherit',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.5',
    cursor: 'pointer',
    opacity: '0.75',
    whiteSpace: 'nowrap',
    flexShrink: '0',
    userSelect: 'none',
    transition: 'opacity 0.15s',
  })

  btn.addEventListener('pointerenter', () => {
    if (!btn.disabled) btn.style.opacity = '1'
  })
  btn.addEventListener('pointerleave', () => {
    btn.style.opacity = '0.75'
  })

  btn.addEventListener('click', () => void handleRecallClick(btn))

  wrapper.appendChild(input)
  wrapper.appendChild(btn)
  return wrapper
}

// ─── Insertion Point Resolution ───────────────────────────────────────────────
// Gemini's composer has a trailing-actions area with mic + send buttons.
// We place the Recall button just before the send button.

const SEND_BUTTON_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[data-mat-icon-name="send"]',
  '[data-testid="send-button"]',
  'button.send-button',
  // mat-icon-button with send icon inside trailing actions
  '.trailing-actions button:last-child',
]

const MIC_BUTTON_SELECTORS = [
  'button[aria-label="Use microphone"]',
  'button[aria-label*="microphone" i]',
  '.trailing-actions button[aria-label*="mic" i]',
]

/**
 * Returns { container, before } for insertBefore placement.
 *
 * Priority:
 *   1. Send button → insert before it
 *   2. Mic button → insert after it
 *   3. Walk up from editor, find ancestor with ≥2 buttons → insert before last
 */
function findInsertionPoint(): { container: HTMLElement; before: HTMLElement | null } | null {
  // Strategy 1: send button
  for (const sel of SEND_BUTTON_SELECTORS) {
    const send = document.querySelector<HTMLElement>(sel)
    if (send?.parentElement) {
      return { container: send.parentElement as HTMLElement, before: send }
    }
  }

  // Strategy 2: mic button — insert immediately after it
  for (const sel of MIC_BUTTON_SELECTORS) {
    const mic = document.querySelector<HTMLElement>(sel)
    if (mic?.parentElement) {
      return {
        container: mic.parentElement as HTMLElement,
        before: mic.nextElementSibling as HTMLElement | null,
      }
    }
  }

  // Strategy 3: walk up from editor, find ancestor with ≥2 buttons
  const editor = document.querySelector<HTMLElement>(
    'rich-textarea .ql-editor, .input-area [contenteditable="true"]'
  )
  if (!editor) return null

  let el: HTMLElement | null = editor.parentElement as HTMLElement | null
  while (el && el !== document.body) {
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>(':scope button'))
    if (buttons.length >= 2) {
      const lastBtn = buttons[buttons.length - 1]
      const container = (lastBtn.parentElement as HTMLElement) ?? el
      return { container, before: lastBtn }
    }
    el = el.parentElement as HTMLElement | null
  }

  return null
}

// ─── DOM Injection ────────────────────────────────────────────────────────────

function tryInjectButton(): void {
  if (document.getElementById(BUTTON_ID)) return

  const point = findInsertionPoint()
  if (!point) return

  const btn = createRecallButton()
  point.container.insertBefore(btn, point.before)
}

// ─── DOM Conversation Scraper ─────────────────────────────────────────────────
// Captures historical messages already rendered in the DOM (i.e. when a user
// opens an existing Gemini conversation). Sends them via window.postMessage in
// the same format as the network interceptor so the isolated content script
// (interceptor.ts) can forward them to the background.
//
// Gemini DOM structure (as of 2026):
//
//   User turn:
//     <user-query>
//       …
//       <p class="query-text-line ng-star-inserted">…</p>  ← one per text line
//       …
//     </user-query>
//
//   Assistant turn:
//     <message-content>
//       <div class="inline-copy-host">
//         <div class="markdown markdown-main-panel …">…</div>
//       </div>
//     </message-content>
//
// querySelectorAll('user-query, message-content') returns both element types in
// document order, giving us the interleaved conversation sequence for free.

const POST_TYPE = '__ai_memory_capture__'
const DOM_SYNC_URL = 'https://gemini.google.com/dom-sync'

/** Extract the Gemini conversation ID from the current URL.
 *  URL pattern: https://gemini.google.com/app/<conversationId>
 */
function extractGeminiConversationId(): string | null {
  const m = window.location.pathname.match(/\/app\/([^/?#]+)/)
  return m ? m[1] : null
}

interface ScrapedTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Walk the DOM in document order and collect all conversation turns.
 * Uses the custom elements <user-query> and <message-content> as stable turn
 * boundaries — no marker sorting needed since querySelectorAll preserves DOM order.
 */
function scrapeConversationTurns(): ScrapedTurn[] {
  const turns: ScrapedTurn[] = []

  const els = document.querySelectorAll<Element>('user-query, message-content')

  for (const el of els) {
    if (el.tagName.toLowerCase() === 'user-query') {
      // Collect all text lines from the user bubble
      const lines = el.querySelectorAll<HTMLElement>('p.query-text-line')
      if (lines.length > 0) {
        const content = Array.from(lines)
          .map((p) => p.innerText?.trim() ?? '')
          .filter(Boolean)
          .join('\n')
        if (content) turns.push({ role: 'user', content })
      }
    } else {
      // message-content: grab the rendered markdown panel
      const md = el.querySelector<HTMLElement>('.markdown.markdown-main-panel')
      if (md) {
        const content = md.innerText?.trim() ?? ''
        if (content) turns.push({ role: 'assistant', content })
      }
    }
  }

  return turns
}

// Tracks which conversations already have an active observer (prevents duplicate observers).
const _scannedConversations = new Set<string>()
// Tracks content keys already sent per conversation (prevents re-sending within one page session).
const _sentContent = new Map<string, Set<string>>()

function runDomSync(conversationId: string): void {
  const turns = scrapeConversationTurns()
  if (!turns.length) return

  if (!_sentContent.has(conversationId)) _sentContent.set(conversationId, new Set())
  const sent = _sentContent.get(conversationId)!

  // Filter to only new turns and assign sequential timestamps for correct ordering.
  const baseTs = Date.now()
  const newTurns: Array<{ role: string; content: string; timestamp: number }> = []
  for (const turn of turns) {
    const key = `${turn.role}:${turn.content}`
    if (sent.has(key)) continue
    sent.add(key)
    newTurns.push({ role: turn.role, content: turn.content, timestamp: baseTs + newTurns.length })
  }

  if (!newTurns.length) return

  // Send all turns in ONE postMessage so the background handler receives them as a
  // batch. Session-level dedup in the background (hasSessionRecords) works correctly
  // only when all records for a conversation arrive together — sending one-at-a-time
  // caused the second message onward to be dropped after the first was stored.
  window.postMessage(
    {
      type: POST_TYPE,
      payload: {
        provider: 'google',
        rawData: { turns: newTurns, conversationId, fromHistory: true },
        url: DOM_SYNC_URL,
        timestamp: baseTs,
      },
    },
    window.location.origin
  )
}

/**
 * Wait until the conversation DOM has fully settled, then scrape.
 *
 * Gemini renders messages newest-first, then fills in older ones.
 * We use an idle-debounce approach: every time new nodes appear we
 * reset a short timer. Only when the DOM has been quiet for SETTLE_MS
 * do we consider the full conversation loaded and run the scan.
 * A hard 15s ceiling prevents the observer from leaking forever.
 */
function waitForDomAndSync(conversationId: string): void {
  const SETTLE_MS = 600
  const MAX_WAIT_MS = 15_000

  // Mark as being watched immediately to prevent duplicate observers from maybeSyncConversation
  _scannedConversations.add(conversationId)

  let settleTimer: ReturnType<typeof setTimeout> | null = null

  // Hard timeout: disconnect observer and do a final scrape after MAX_WAIT_MS
  const hardTimeout = setTimeout(() => {
    syncObserver.disconnect()
    if (settleTimer) clearTimeout(settleTimer)
    runDomSync(conversationId)
  }, MAX_WAIT_MS)

  function onSettle(): void {
    // Scrape on each settle (content dedup in sendCapturedTurn prevents re-sending).
    // Keep the observer alive so lazy-loaded older messages (e.g. scrolling up) are also captured.
    runDomSync(conversationId)
  }

  function resetSettle(): void {
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(onSettle, SETTLE_MS)
  }

  const syncObserver = new MutationObserver(resetSettle)
  syncObserver.observe(document.body, { childList: true, subtree: true })

  // If conversation elements are already present, start the settle timer immediately
  if (document.querySelector('user-query, message-content')) {
    resetSettle()
  }
}

function maybeSyncConversation(): void {
  const conversationId = extractGeminiConversationId()
  if (!conversationId) return
  if (_scannedConversations.has(conversationId)) return
  waitForDomAndSync(conversationId)
}

// ─── SPA Navigation Observer ──────────────────────────────────────────────────

let rafPending = false
let _lastObservedUrl = window.location.href

function scheduleInjection(): void {
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    tryInjectButton()

    // Detect SPA navigation and trigger DOM sync for the new conversation
    const currentUrl = window.location.href
    if (currentUrl !== _lastObservedUrl) {
      _lastObservedUrl = currentUrl
      maybeSyncConversation()
    }
  })
}

const observer = new MutationObserver(scheduleInjection)

function start(): void {
  tryInjectButton()
  observer.observe(document.body, { childList: true, subtree: true })

  // Sync on initial page load
  maybeSyncConversation()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
