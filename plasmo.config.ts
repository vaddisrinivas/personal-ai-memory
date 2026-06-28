import { defineConfig } from "plasmo"

export default defineConfig({
  manifest: (env) => {
    const baseManifest = {
      manifest_version: 3,
      key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6zHmhMWQ9QEqrvkwSH6jeqrNNZ4ZDkVDe+P9+4cEQRci1R+3/aMGoH3IYCgN2lRao0kzgXJLOCMuRGr2v5KCMoQVVxUbIdM9+JwS6lh7q/LdZZtW7sRXwismoJoeVrRku+gdaQep8R0TNv6cEZnBaTjRb/yoMuCoUH5BgxK5sLs5jiQUX7N0+O0vWujYZTisu9ke2o/1XbFLzNLSubeS1To+qYXrXcJfelfRFzU9VKF6xzWAgi/m5FMN+IdjUlRLDx4/9pamP2IhIf3544OsS9NgXBhgLAMvPsctOI6ZhXrFX6JbcHmlcqz/pqoY5IzYgyAymBJD4cnnFKsbQUq35wIDAQAB",
      permissions: ["storage", "unlimitedStorage", "tabs", "scripting", "offscreen", "nativeMessaging", "alarms"],
      host_permissions: [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://www.perplexity.ai/*",
        "https://grok.com/*",
        // Add your API Gateway domain here after deploying lambda-proxy, e.g.:
        // "https://abc123.execute-api.us-east-1.amazonaws.com/*",
      ],
      action: {
        default_title: "Personal AI Memory",
        default_popup: "popup.html"
      }
    }
    return baseManifest
  }
})
