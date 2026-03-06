import React from "react";
import { createRoot } from "react-dom/client";
import type { PlasmoCSConfig } from "plasmo";
import {
  FloatingMemoryPanel,
  openMemoryPanelExternally,
} from "../ui/memory-panel/FloatingMemoryPanel";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
};

const AI_HOSTNAMES = new Set([
  "chat.openai.com",
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "www.perplexity.ai",
  "grok.com",
]);

function isAISite(): boolean {
  try {
    return AI_HOSTNAMES.has(new URL(window.location.href).hostname);
  } catch {
    return false;
  }
}

const ROOT_ID = "ai-memory-float-root";

function mountFloatUI() {
  if (document.getElementById(ROOT_ID)) return;
  const el = document.createElement("div");
  el.id = ROOT_ID;
  document.body.appendChild(el);
  createRoot(el).render(<FloatingMemoryPanel />);
}

// ChatGPT's React hydration can replace document.body children.
// Watch for our root div being removed and re-mount immediately.
const bodyObserver = new MutationObserver(() => {
  if (!document.getElementById(ROOT_ID)) {
    mountFloatUI();
  }
});

chrome.runtime.onMessage.addListener(
  (msg: { type?: string }, _sender, sendResponse) => {
    if (msg?.type === "OPEN_MEMORY_PANEL") {
      mountFloatUI();
      openMemoryPanelExternally();
      sendResponse();
      return true;
    }
    return false;
  },
);

function start() {
  if (isAISite()) {
    mountFloatUI();
    bodyObserver.observe(document.body, { childList: true });
  } else {
    // On non-AI sites, only mount when explicitly triggered via OPEN_MEMORY_PANEL
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
