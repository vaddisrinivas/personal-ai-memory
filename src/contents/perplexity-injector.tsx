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

import type { PlasmoCSConfig } from "plasmo";
import { watchOnboardingStep3 } from "../utils/onboarding-highlight";
import { handleRecallClick as sharedHandleRecallClick } from "../utils/recall-helpers";
import { createRecallButton as sharedCreateRecallButton } from "../utils/recall-button";

export const config: PlasmoCSConfig = {
  matches: ["https://www.perplexity.ai/*"],
};

const BUTTON_ID = "ai-memory-perplexity-recall-btn";
const INPUT_ID = "ai-memory-perplexity-recall-topk";
const DEFAULT_TOP_K = 3;

// ─── Text Extraction ──────────────────────────────────────────────────────────
// Perplexity uses a contenteditable div as its composer.

function getInputText(): string {
  const editor = document.querySelector<HTMLElement>(
    'div[contenteditable="true"][data-lexical-editor], div[contenteditable="true"][aria-placeholder]',
  );
  return editor?.innerText?.trim() ?? "";
}

// ─── Text Injection ───────────────────────────────────────────────────────────
// Perplexity uses a Lexical-based contenteditable editor.
// execCommand('insertText') is deprecated and unreliable in Lexical.
// Most reliable approach: simulate a clipboard paste event, which Lexical intercepts
// and uses to set its internal state correctly.

function injectText(text: string): void {
  const editor = document.querySelector<HTMLElement>(
    'div[contenteditable="true"][data-lexical-editor], div[contenteditable="true"][aria-placeholder]',
  );
  if (!editor) {
    console.warn("[AI Memory] Could not find Lexical editor element");
    return;
  }

  editor.focus();

  // Select all existing content first
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Simulate a paste event with the text — Lexical listens for this and
  // updates its internal state, which also triggers React's onChange chain.
  const dt = new DataTransfer();
  dt.setData("text/plain", text);

  const pasteEvent = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  });

  editor.dispatchEvent(pasteEvent);

  // If paste was handled (default not prevented), Lexical has updated itself.
  // If it was NOT handled (some Perplexity builds block paste), fall back to
  // execCommand which at minimum works in Chrome for simple cases.
  if (!pasteEvent.defaultPrevented) {
    // Lexical handled it — nothing more to do
    return;
  }

  // execCommand fallback
  document.execCommand("selectAll", false, undefined);
  document.execCommand("insertText", false, text);
}

// ─── Button Creation ──────────────────────────────────────────────────────────

function createRecallButton(): HTMLElement {
  return sharedCreateRecallButton({
    buttonId: BUTTON_ID,
    inputId: INPUT_ID,
    defaultTopK: DEFAULT_TOP_K,
    extraWrapperStyles: {
      pointerEvents: "auto",
      position: "relative",
      zIndex: "9999",
    },
    extraButtonStyles: { pointerEvents: "auto" },
    onButtonClick: (btn, e) => {
      e.preventDefault();
      e.stopPropagation();
      void sharedHandleRecallClick(btn, {
        buttonId: BUTTON_ID,
        inputId: INPUT_ID,
        defaultTopK: DEFAULT_TOP_K,
        getInputText,
        injectText,
      });
    },
    extraButtonListeners: (btn) => {
      // Fallback: some host-page event handlers swallow click; use mousedown as backup
      btn.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    },
  });
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

function findInsertionPoint(): {
  container: HTMLElement;
  before: HTMLElement | null;
} | null {
  // Primary: insert immediately after the "Choose a model" button
  const modelBtn = document.querySelector<HTMLElement>(
    'button[aria-label="Choose a model"]',
  );
  if (modelBtn?.parentElement) {
    return {
      container: modelBtn.parentElement as HTMLElement,
      before: modelBtn.nextElementSibling as HTMLElement | null,
    };
  }

  // Fallback: find the div.relative wrapping the Dictation button, insert before it
  const dictationBtn = document.querySelector<HTMLElement>(
    'button[aria-label="Dictation"]',
  );
  if (dictationBtn) {
    let el: HTMLElement | null = dictationBtn.parentElement;
    while (el && !(el.tagName === "DIV" && el.classList.contains("relative"))) {
      el = el.parentElement;
    }
    const dictationWrapper = el;
    if (dictationWrapper?.parentElement) {
      return {
        container: dictationWrapper.parentElement as HTMLElement,
        before: dictationWrapper,
      };
    }
    if (dictationBtn.parentElement) {
      return {
        container: dictationBtn.parentElement as HTMLElement,
        before: dictationBtn,
      };
    }
  }

  // Last resort: insert before the Submit button
  const submitBtn = document.querySelector<HTMLElement>(
    'button[aria-label="Submit"]',
  );
  if (submitBtn?.parentElement) {
    return {
      container: submitBtn.parentElement as HTMLElement,
      before: submitBtn,
    };
  }

  return null;
}

// ─── DOM Injection ────────────────────────────────────────────────────────────

function tryInjectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const point = findInsertionPoint();
  if (!point) return;

  const btn = createRecallButton();
  point.container.insertBefore(btn, point.before);
}

// ─── SPA Navigation Observer ──────────────────────────────────────────────────
// Perplexity is a React SPA; navigating between threads replaces DOM nodes.
// Use MutationObserver + rAF debounce to re-inject after each render.

let rafPending = false;

function scheduleInjection(): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    tryInjectButton();
  });
}

const observer = new MutationObserver(scheduleInjection);

function start(): void {
  tryInjectButton();
  observer.observe(document.body, { childList: true, subtree: true });

  // Onboarding Step 3: highlight Recall button if active
  watchOnboardingStep3(BUTTON_ID);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
