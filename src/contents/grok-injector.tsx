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

import type { PlasmoCSConfig } from "plasmo";
import { watchOnboardingStep3 } from "../utils/onboarding-highlight";
import { handleRecallClick as sharedHandleRecallClick } from "../utils/recall-helpers";
import { createRecallButton as sharedCreateRecallButton } from "../utils/recall-button";

export const config: PlasmoCSConfig = {
  matches: ["https://grok.com/*"],
};

const BUTTON_ID = "ai-memory-grok-recall-btn";
const INPUT_ID = "ai-memory-grok-recall-topk";
const DEFAULT_TOP_K = 3;

// ─── Text Extraction ──────────────────────────────────────────────────────────

function getComposerEditor(): HTMLElement | null {
  // Prefer the specific TipTap/ProseMirror composer over any other contenteditable
  // (e.g. message history items, code blocks, inline editors).
  return (
    document.querySelector<HTMLElement>('div.tiptap[contenteditable="true"]') ??
    document.querySelector<HTMLElement>(
      'div.ProseMirror[contenteditable="true"]',
    ) ??
    document.querySelector<HTMLElement>('div[contenteditable="true"]')
  );
}

function getInputText(): string {
  const editor = getComposerEditor();
  if (editor) {
    // TipTap/ProseMirror marks empty paragraphs with is-empty / is-editor-empty.
    // Check this first to avoid false positives from innerText on <br>-only nodes.
    const firstPara = editor.querySelector("p");
    if (
      firstPara &&
      editor.children.length === 1 &&
      (firstPara.classList.contains("is-empty") ||
        firstPara.classList.contains("is-editor-empty"))
    ) {
      return "";
    }
    const text = editor.innerText?.trim();
    if (text) return text;
  }

  // Fallback: textarea
  const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
  return textarea?.value?.trim() ?? "";
}

// ─── Text Injection ───────────────────────────────────────────────────────────

function injectText(text: string): void {
  // Prefer the visual contenteditable (TipTap/ProseMirror) — Grok uses this as its
  // actual editor. The textarea, if present, is a hidden React-controlled element;
  // setting its value does not update the visual editor or React state.
  const editor = getComposerEditor();
  if (editor) {
    editor.focus();
    // Explicitly select the editor's contents before inserting, so the injected
    // prompt fully replaces the user's previous input instead of being appended.
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand("insertText", false, text);
    return;
  }

  // Last resort: textarea (React-controlled, may not update visual editor)
  const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
  if (textarea) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, text);
    } else {
      textarea.value = text;
    }
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.focus();
    return;
  }

  console.warn("[AI Memory] Could not find Grok composer element");
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
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault(); // Prevent focus transfer so textarea.value is readable on click
        e.stopPropagation();
      });
    },
  });
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

function findInsertionPoint(): {
  container: HTMLElement;
  before: HTMLElement | null;
} | null {
  // Primary: find the lucide-mic SVG → get its container div
  const micSvg = document.querySelector<SVGElement>("svg.lucide-mic");
  if (micSvg) {
    // Walk up to find the div with rounded-full overflow-hidden shrink-0
    let el: HTMLElement | null = micSvg.parentElement;
    while (el && el.tagName !== "BODY") {
      if (
        el.tagName === "DIV" &&
        el.classList.contains("rounded-full") &&
        el.classList.contains("overflow-hidden") &&
        el.classList.contains("shrink-0")
      ) {
        // Insert after this div (before its next sibling)
        if (el.parentElement) {
          return {
            container: el.parentElement as HTMLElement,
            before: el.nextElementSibling as HTMLElement | null,
          };
        }
      }
      el = el.parentElement;
    }
    // Wrapper not found — fall back to inserting after the mic button itself
    const micBtn = micSvg.closest("button");
    if (micBtn?.parentElement) {
      return {
        container: micBtn.parentElement as HTMLElement,
        before: micBtn.nextElementSibling as HTMLElement | null,
      };
    }
  }

  // Fallback: find submit/send button and insert before it
  const submitBtn = document.querySelector<HTMLElement>(
    'button[type="submit"]',
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
