import { summarizeWithGemini } from "./geminiClient.js";
import { openOptionsPage } from "./optionsNavigation.js";

const api = typeof chrome !== "undefined" ? chrome : browser;

export function registerMessageListener() {
  if (!api.runtime || !api.runtime.onMessage) return;

  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      return;
    }

    if (message.type === "oz-summarize-email") {
      const bodyText = message.bodyText || "";

      summarizeWithGemini(bodyText).then((result) => {
        try {
          sendResponse(result);
        } catch (e) {
          // best-effort only
        }
      });
      return true;
    }

    if (message.type === "oz-open-options") {
      try {
        openOptionsPage();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
      return true;
    }

    return undefined;
  });
}


