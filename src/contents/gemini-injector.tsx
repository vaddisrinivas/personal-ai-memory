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

import type { PlasmoCSConfig } from "plasmo";
import { watchOnboardingStep3 } from "../utils/onboarding-highlight";
import { handleRecallClick as sharedHandleRecallClick } from "../utils/recall-helpers";
import { createRecallButton as sharedCreateRecallButton } from "../utils/recall-button";

export const config: PlasmoCSConfig = {
  matches: ["https://gemini.google.com/*"],
};

const BUTTON_ID = "ai-memory-gemini-recall-btn";
const INPUT_ID = "ai-memory-gemini-recall-topk";
const DEFAULT_TOP_K = 3;

// ─── Text Extraction ──────────────────────────────────────────────────────────
// Gemini uses a Quill-based rich-textarea component with a contenteditable div.

function getInputText(): string {
  // Quill editor inside <rich-textarea>
  const quill = document.querySelector<HTMLElement>(
    'rich-textarea .ql-editor[contenteditable="true"]',
  );
  if (quill) return quill.innerText?.trim() ?? "";

  // Fallback: any visible contenteditable in the input area
  const fallback = document.querySelector<HTMLElement>(
    '.input-area [contenteditable="true"], [data-testid="input-area"] [contenteditable="true"]',
  );
  return fallback?.innerText?.trim() ?? "";
}

// ─── Text Injection ───────────────────────────────────────────────────────────
// Quill intercepts native DOM events. execCommand is the most compatible way
// to inject text while triggering Quill's internal change handlers.

function injectText(text: string): void {
  const quill = document.querySelector<HTMLElement>(
    'rich-textarea .ql-editor[contenteditable="true"]',
  );
  const target =
    quill ??
    document.querySelector<HTMLElement>(
      '.input-area [contenteditable="true"], [data-testid="input-area"] [contenteditable="true"]',
    );

  if (!target) return;

  target.focus();
  // Select all existing content then replace it
  document.execCommand("selectAll", false, undefined);
  document.execCommand("insertText", false, text);

  // If execCommand did not fire Quill's handler, dispatch an input event
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

// ─── Button Creation ──────────────────────────────────────────────────────────

function createRecallButton(): HTMLElement {
  return sharedCreateRecallButton({
    buttonId: BUTTON_ID,
    inputId: INPUT_ID,
    defaultTopK: DEFAULT_TOP_K,
    onButtonClick: (btn) =>
      void sharedHandleRecallClick(btn, {
        buttonId: BUTTON_ID,
        inputId: INPUT_ID,
        defaultTopK: DEFAULT_TOP_K,
        getInputText,
        injectText,
      }),
  });
}

// ─── Insertion Point Resolution ───────────────────────────────────────────────
// Gemini's toolbar (from DOM inspection, 2026):
//
//   <parent-toolbar>
//     <div class="model-picker-container">      ← mode picker, always present
//       <bard-mode-switcher>…</bard-mode-switcher>
//     </div>
//     <!-- Recall button goes here -->
//     <div class="input-buttons-wrapper-bottom"> ← contains mic OR send
//       <div class="mic-button-container [hidden]">
//         <speech-dictation-mic-button aria-label="Microphone">…</speech-dictation-mic-button>
//       </div>
//       <div class="send-button-container [visible]">
//         <button aria-label="Send message">…</button>
//       </div>
//     </div>
//   </parent-toolbar>
//
// Anchoring to mic/send buttons is fragile because mic-button-container gets
// class="hidden" when the user types, making any Recall button inserted inside it
// also disappear, and disturbing the flex layout of input-buttons-wrapper-bottom.
// Instead we anchor to .model-picker-container which is always present and stable.

/**
 * Returns { container, before } for insertBefore placement.
 *
 * Primary: Insert Recall as a sibling of .model-picker-container and
 * .input-buttons-wrapper-bottom, positioned between them.
 * This is stable across the mic↔send swap that happens as the user types.
 */
function findInsertionPoint(): {
  container: HTMLElement;
  before: HTMLElement | null;
} | null {
  // Strategy 1: anchor to model-picker-container (always in DOM)
  const modelPicker = document.querySelector<HTMLElement>(
    ".model-picker-container",
  );
  if (modelPicker?.parentElement) {
    const parent = modelPicker.parentElement as HTMLElement;
    // Insert before the buttons wrapper so Recall sits between picker and buttons
    const buttonsWrapper = parent.querySelector<HTMLElement>(
      ".input-buttons-wrapper-bottom",
    );
    return { container: parent, before: buttonsWrapper };
  }

  // Strategy 2: send button — fallback if model-picker selector changes
  const send = document.querySelector<HTMLElement>(
    'button[aria-label="Send message"]',
  );
  if (send?.parentElement) {
    return { container: send.parentElement as HTMLElement, before: send };
  }

  // Strategy 3: walk up from editor, find ancestor with ≥2 buttons
  const editor = document.querySelector<HTMLElement>(
    'rich-textarea .ql-editor, .input-area [contenteditable="true"]',
  );
  if (!editor) return null;

  let el: HTMLElement | null = editor.parentElement as HTMLElement | null;
  while (el && el !== document.body) {
    const buttons = Array.from(
      el.querySelectorAll<HTMLButtonElement>(":scope button"),
    );
    if (buttons.length >= 2) {
      const lastBtn = buttons[buttons.length - 1];
      const container = (lastBtn.parentElement as HTMLElement) ?? el;
      return { container, before: lastBtn };
    }
    el = el.parentElement as HTMLElement | null;
  }

  return null;
}

// ─── DOM Injection ────────────────────────────────────────────────────────────
// Gemini swaps between mic and send button in the same container as user types.
// When that swap happens, our wrapper stays but its sibling reference changes.
// We always anchor by finding the current mic or send button and re-inserting if
// the wrapper is already detached or in the wrong position.

function tryInjectButton(): void {
  const existing = document.getElementById(BUTTON_ID);

  const point = findInsertionPoint();
  if (!point) return;

  // If button exists and is already a child of the correct container, keep it.
  if (existing && existing.parentElement?.parentElement === point.container)
    return;
  if (existing && existing.parentElement === point.container) return;

  // Remove stale wrapper if detached from target container
  existing?.parentElement?.remove();

  const btn = createRecallButton();
  point.container.insertBefore(btn, point.before);
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

const POST_TYPE = "__ai_memory_capture__";
const DOM_SYNC_URL = "https://gemini.google.com/dom-sync";

/** Extract the Gemini conversation ID from the current URL.
 *  URL pattern: https://gemini.google.com/app/<conversationId>
 */
function extractGeminiConversationId(): string | null {
  const m = window.location.pathname.match(/\/app\/([^/?#]+)/);
  return m ? m[1] : null;
}

interface ScrapedTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Walk the DOM in document order and collect all conversation turns.
 * Uses the custom elements <user-query> and <message-content> as stable turn
 * boundaries — no marker sorting needed since querySelectorAll preserves DOM order.
 */
function scrapeConversationTurns(): ScrapedTurn[] {
  const turns: ScrapedTurn[] = [];

  const els = document.querySelectorAll<Element>("user-query, message-content");

  for (const el of els) {
    if (el.tagName.toLowerCase() === "user-query") {
      // Collect all text lines from the user bubble
      const lines = el.querySelectorAll<HTMLElement>("p.query-text-line");
      if (lines.length > 0) {
        const content = Array.from(lines)
          .map((p) => p.innerText?.trim() ?? "")
          .filter(Boolean)
          .join("\n");
        if (content) turns.push({ role: "user", content });
      }
    } else {
      // message-content: grab the rendered markdown panel
      const md = el.querySelector<HTMLElement>(".markdown.markdown-main-panel");
      if (md) {
        const content = md.innerText?.trim() ?? "";
        if (content) turns.push({ role: "assistant", content });
      }
    }
  }

  return turns;
}

// Tracks which conversations already have an active observer (prevents duplicate observers).
const _scannedConversations = new Set<string>();
// Tracks content keys already sent per conversation (prevents re-sending within one page session).
const _sentContent = new Map<string, Set<string>>();

function runDomSync(conversationId: string): void {
  const turns = scrapeConversationTurns();
  if (!turns.length) return;

  if (!_sentContent.has(conversationId))
    _sentContent.set(conversationId, new Set());
  const sent = _sentContent.get(conversationId)!;

  // Filter to only new turns and assign sequential timestamps for correct ordering.
  const baseTs = Date.now();
  const newTurns: Array<{ role: string; content: string; timestamp: number }> =
    [];
  for (const turn of turns) {
    const key = `${turn.role}:${turn.content}`;
    if (sent.has(key)) continue;
    sent.add(key);
    newTurns.push({
      role: turn.role,
      content: turn.content,
      timestamp: baseTs + newTurns.length,
    });
  }

  if (!newTurns.length) return;

  // Send all turns in ONE postMessage so the background handler receives them as a
  // batch. Session-level dedup in the background (hasSessionRecords) works correctly
  // only when all records for a conversation arrive together — sending one-at-a-time
  // caused the second message onward to be dropped after the first was stored.
  window.postMessage(
    {
      type: POST_TYPE,
      payload: {
        provider: "google",
        rawData: { turns: newTurns, conversationId, fromHistory: true },
        url: DOM_SYNC_URL,
        timestamp: baseTs,
      },
    },
    window.location.origin,
  );
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
  const SETTLE_MS = 600;
  const MAX_WAIT_MS = 15_000;

  // Mark as being watched immediately to prevent duplicate observers from maybeSyncConversation
  _scannedConversations.add(conversationId);

  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  // Hard timeout: disconnect observer and do a final scrape after MAX_WAIT_MS
  const hardTimeout = setTimeout(() => {
    syncObserver.disconnect();
    if (settleTimer) clearTimeout(settleTimer);
    runDomSync(conversationId);
  }, MAX_WAIT_MS);

  function onSettle(): void {
    // Scrape on each settle (content dedup in sendCapturedTurn prevents re-sending).
    // Keep the observer alive so lazy-loaded older messages (e.g. scrolling up) are also captured.
    runDomSync(conversationId);
  }

  function resetSettle(): void {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, SETTLE_MS);
  }

  const syncObserver = new MutationObserver(resetSettle);
  syncObserver.observe(document.body, { childList: true, subtree: true });

  // If conversation elements are already present, start the settle timer immediately
  if (document.querySelector("user-query, message-content")) {
    resetSettle();
  }
}

function maybeSyncConversation(): void {
  const conversationId = extractGeminiConversationId();
  if (!conversationId) return;
  if (_scannedConversations.has(conversationId)) return;
  waitForDomAndSync(conversationId);
}

// ─── SPA Navigation Observer ──────────────────────────────────────────────────

let rafPending = false;
let _lastObservedUrl = window.location.href;

function scheduleInjection(): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    tryInjectButton();

    // Detect SPA navigation and trigger DOM sync for the new conversation
    const currentUrl = window.location.href;
    if (currentUrl !== _lastObservedUrl) {
      _lastObservedUrl = currentUrl;
      maybeSyncConversation();
    }
  });
}

const observer = new MutationObserver(scheduleInjection);

function start(): void {
  tryInjectButton();
  observer.observe(document.body, { childList: true, subtree: true });

  // Sync on initial page load
  maybeSyncConversation();

  // Onboarding Step 3: highlight Recall button if active
  watchOnboardingStep3(BUTTON_ID);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
