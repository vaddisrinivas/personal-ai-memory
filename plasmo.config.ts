import { defineConfig } from "plasmo"

export default defineConfig({
  manifest: (env) => {
    const baseManifest = {
      manifest_version: 3,
      permissions: ["storage", "unlimitedStorage", "tabs", "scripting", "offscreen"],
      host_permissions: [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://www.perplexity.ai/*",
        "https://grok.com/*",
      ],
      action: {
        default_title: "Personal AI Memory",
        default_popup: "popup.html"
      }
    }
    return baseManifest
  }
})
