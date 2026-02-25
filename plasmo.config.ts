import { defineConfig } from "plasmo"

export default defineConfig({
  manifest: (env) => {
    const baseManifest = {
      manifest_version: 3,
      permissions: ["storage", "unlimitedStorage", "tabs", "scripting", "offscreen"],
      action: {
        default_title: "Personal AI Memory",
        default_popup: "popup.html"
      }
    }
    return baseManifest
  }
})
