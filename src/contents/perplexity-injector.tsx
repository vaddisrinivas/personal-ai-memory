/**
 * Perplexity Recall Button — Content Script
 *
 * Injects a "Recall" button into Perplexity's composer toolbar, between
 * the "Choose a model" button and the "Dictation" button.
 *
 * On click, it:
 *   1. Extracts the current composer text as the query.
 *   2. Sends SEARCH_MEMORIES to the background service worker.
 *   3. Formats top-k results as a RAG prompt.
 *   4. Injects the formatted prompt into Perplexity's contenteditable editor.
 */

import type { PlasmoCSConfig } from 'plasmo'
import type { SearchMemoriesResponse } from '../types/messages'

export const config: PlasmoCSConfig = {
  matches: ['https://www.perplexity.ai/*'],
}

const BUTTON_ID = 'ai-memory-perplexity-recall-btn'
const INPUT_ID = 'ai-memory-perplexity-recall-topk'
const STORAGE_KEY = 'recallTopK'
const DEFAULT_TOP_K = 3

// ─── Text Extraction ──────────────────────────────────────────────────────────
// Perplexity uses a contenteditable div as its composer.

function getInputText(): string {
  const editor = document.querySelector<HTMLElement>(
    'div[contenteditable="true"][data-lexical-editor], div[contenteditable="true"][aria-placeholder]'
  )
  return editor?.innerText?.trim() ?? ''
}

// ─── Text Injection ───────────────────────────────────────────────────────────
// Perplexity uses a Lexical-based contenteditable editor.
// execCommand('insertText') is deprecated and unreliable in Lexical.
// Most reliable approach: simulate a clipboard paste event, which Lexical intercepts
// and uses to set its internal state correctly.

function injectText(text: string): void {
  const editor = document.querySelector<HTMLElement>(
    'div[contenteditable="true"][data-lexical-editor], div[contenteditable="true"][aria-placeholder]'
  )
  if (!editor) {
    console.warn('[AI Memory] Could not find Lexical editor element')
    return
  }

  editor.focus()

  // Select all existing content first
  const selection = window.getSelection()
  if (selection) {
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // Simulate a paste event with the text — Lexical listens for this and
  // updates its internal state, which also triggers React's onChange chain.
  const dt = new DataTransfer()
  dt.setData('text/plain', text)

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  })

  editor.dispatchEvent(pasteEvent)

  // If paste was handled (default not prevented), Lexical has updated itself.
  // If it was NOT handled (some Perplexity builds block paste), fall back to
  // execCommand which at minimum works in Chrome for simple cases.
  if (!pasteEvent.defaultPrevented) {
    // Lexical handled it — nothing more to do
    return
  }

  // execCommand fallback
  document.execCommand('selectAll', false, undefined)
  document.execCommand('insertText', false, text)
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
  const query = getInputText().trim()
  if (!query) { alert('[AI Memory] Please type your question first, then click Recall.'); return }
  if (query.includes('[System Context: The following are relevant memories')) {
    alert('[AI Memory] Memories already recalled. Clear the text and type your question again to recall fresh memories.')
    return
  }
  console.log('[AI Memory] Recall clicked, query:', query)

  btn.textContent = 'Searching...'
  btn.disabled = true

  try {
    const response = await searchMemories(query)
    console.log('[AI Memory] Search response:', response)
    const results = response.payload.results ?? []

    if (results.length === 0) {
      alert('[AI Memory] No relevant memories found for your query.')
      return
    }

    injectText(formatRAGPrompt(query, results))
  } catch (err) {
    console.error('[AI Memory] Recall failed:', err)
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
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: '9999',
  })

  // topK input
  const input = document.createElement('input')
  input.id = INPUT_ID
  input.type = 'number'
  input.min = '1'
  input.max = '20'
  input.title = 'Number of memories to recall'
  Object.assign(input.style, sharedInputStyle)

  chrome.storage.local.get([STORAGE_KEY], (res) => {
    input.value = String(res[STORAGE_KEY] ?? DEFAULT_TOP_K)
  })

  input.addEventListener('change', () => {
    const v = Math.max(1, Math.min(20, parseInt(input.value, 10) || DEFAULT_TOP_K))
    input.value = String(v)
    chrome.storage.local.set({ [STORAGE_KEY]: v })
  })

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
    pointerEvents: 'auto',
  })

  btn.addEventListener('pointerenter', () => {
    if (!btn.disabled) btn.style.opacity = '1'
  })
  btn.addEventListener('pointerleave', () => {
    btn.style.opacity = '0.75'
  })

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    void handleRecallClick(btn)
  })
  // Fallback: some host-page event handlers swallow click; use mousedown as backup
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })

  wrapper.appendChild(input)
  wrapper.appendChild(btn)
  return wrapper
}

// ─── Insertion Point Resolution ───────────────────────────────────────────────
// Perplexity's composer toolbar layout (as of 2026):
//
//   [button aria-label="Choose a model"]
//   <-- inject Recall here -->
//   [div.relative]              ← wrapper around Dictation button
//     [button aria-label="Dictation"]
//   [button aria-label="Submit"]
//
// Strategy:
//   1. Find model button → insert immediately after it.
//   2. Fallback: find "Dictation" button wrapper → insert before it.
//   3. Last resort: find "Submit" button → insert before it.

function findInsertionPoint(): { container: HTMLElement; before: HTMLElement | null } | null {
  // Primary: insert immediately after the "Choose a model" button
  const modelBtn = document.querySelector<HTMLElement>('button[aria-label="Choose a model"]')
  if (modelBtn?.parentElement) {
    return { container: modelBtn.parentElement as HTMLElement, before: modelBtn.nextElementSibling as HTMLElement | null }
  }

  // Fallback: find the div.relative wrapping the Dictation button, insert before it
  const dictationBtn = document.querySelector<HTMLElement>('button[aria-label="Dictation"]')
  if (dictationBtn) {
    let el: HTMLElement | null = dictationBtn.parentElement
    while (el && !(el.tagName === 'DIV' && el.classList.contains('relative'))) {
      el = el.parentElement
    }
    const dictationWrapper = el
    if (dictationWrapper?.parentElement) {
      return { container: dictationWrapper.parentElement as HTMLElement, before: dictationWrapper }
    }
    if (dictationBtn.parentElement) {
      return { container: dictationBtn.parentElement as HTMLElement, before: dictationBtn }
    }
  }

  // Last resort: insert before the Submit button
  const submitBtn = document.querySelector<HTMLElement>('button[aria-label="Submit"]')
  if (submitBtn?.parentElement) {
    return { container: submitBtn.parentElement as HTMLElement, before: submitBtn }
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

// ─── SPA Navigation Observer ──────────────────────────────────────────────────
// Perplexity is a React SPA; navigating between threads replaces DOM nodes.
// Use MutationObserver + rAF debounce to re-inject after each render.

let rafPending = false

function scheduleInjection(): void {
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    tryInjectButton()
  })
}

const observer = new MutationObserver(scheduleInjection)

function start(): void {
  tryInjectButton()
  observer.observe(document.body, { childList: true, subtree: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
