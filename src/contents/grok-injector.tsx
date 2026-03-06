/**
 * Grok Recall Button — Content Script
 *
 * Injects a "Recall" button into Grok's composer toolbar, after the
 * voice recording button (identified by the lucide-mic SVG icon).
 *
 * On click, it:
 *   1. Extracts the current composer text as the query.
 *   2. Sends SEARCH_MEMORIES to the background service worker.
 *   3. Formats top-k results as a RAG prompt.
 *   4. Injects the formatted prompt into Grok's composer.
 */

import type { PlasmoCSConfig } from 'plasmo'
import type { SearchMemoriesResponse } from '../types/messages'

export const config: PlasmoCSConfig = {
  matches: ['https://grok.com/*'],
}

const BUTTON_ID = 'ai-memory-grok-recall-btn'
const INPUT_ID = 'ai-memory-grok-recall-topk'
const STORAGE_KEY = 'recallTopK'
const DEFAULT_TOP_K = 3

// ─── Text Extraction ──────────────────────────────────────────────────────────

function getInputText(): string {
  // Grok uses a textarea for its composer
  const textarea = document.querySelector<HTMLTextAreaElement>('textarea')
  if (textarea) return textarea.value.trim()

  // Fallback: contenteditable div
  const editor = document.querySelector<HTMLElement>('div[contenteditable="true"]')
  return editor?.innerText?.trim() ?? ''
}

// ─── Text Injection ───────────────────────────────────────────────────────────

function injectText(text: string): void {
  // Try textarea first
  const textarea = document.querySelector<HTMLTextAreaElement>('textarea')
  if (textarea) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, text)
    } else {
      textarea.value = text
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
    textarea.focus()
    return
  }

  // Fallback: contenteditable (use clipboard paste simulation like Perplexity)
  const editor = document.querySelector<HTMLElement>('div[contenteditable="true"]')
  if (!editor) {
    console.warn('[AI Memory] Could not find Grok composer element')
    return
  }

  editor.focus()

  const selection = window.getSelection()
  if (selection) {
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const dt = new DataTransfer()
  dt.setData('text/plain', text)

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  })

  editor.dispatchEvent(pasteEvent)

  if (!pasteEvent.defaultPrevented) return

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
  const query = getInputText()

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
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })

  wrapper.appendChild(input)
  wrapper.appendChild(btn)
  return wrapper
}

// ─── Insertion Point Resolution ───────────────────────────────────────────────
// Grok's composer toolbar (as of 2026):
//
//   [div.h-10.rounded-full.overflow-hidden.shrink-0]  ← voice button container (mic icon)
//     [button] → [svg.lucide-mic]
//   <-- inject Recall here -->
//   [button aria-label="進入語音模式"]                ← voice mode toggle
//
// Strategy (no aria-label to avoid locale issues):
//   1. Find svg.lucide-mic → walk up to parent div.rounded-full.overflow-hidden.shrink-0
//      → insert Recall wrapper after that div
//   2. Fallback: find any button containing svg.lucide-mic → insert after its parent
//   3. Last resort: find the composer form/toolbar and append

function findInsertionPoint(): { container: HTMLElement; before: HTMLElement | null } | null {
  // Primary: find the lucide-mic SVG → get its container div
  const micSvg = document.querySelector<SVGElement>('svg.lucide-mic')
  if (micSvg) {
    // Walk up to find the div with rounded-full overflow-hidden shrink-0
    let el: HTMLElement | null = micSvg.parentElement
    while (el && el.tagName !== 'BODY') {
      if (
        el.tagName === 'DIV' &&
        el.classList.contains('rounded-full') &&
        el.classList.contains('overflow-hidden') &&
        el.classList.contains('shrink-0')
      ) {
        // Insert after this div (before its next sibling)
        if (el.parentElement) {
          return {
            container: el.parentElement as HTMLElement,
            before: el.nextElementSibling as HTMLElement | null,
          }
        }
      }
      el = el.parentElement
    }
    // Wrapper not found — fall back to inserting after the mic button itself
    const micBtn = micSvg.closest('button')
    if (micBtn?.parentElement) {
      return {
        container: micBtn.parentElement as HTMLElement,
        before: micBtn.nextElementSibling as HTMLElement | null,
      }
    }
  }

  // Fallback: find submit/send button and insert before it
  const submitBtn = document.querySelector<HTMLElement>('button[type="submit"]')
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
