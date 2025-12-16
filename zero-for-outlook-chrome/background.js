// Background script for Outlook Web Keyboard Shortcuts (Manifest V2)
// Clicking the toolbar icon opens the options page in a full tab.

(() => {
  const api = typeof chrome !== "undefined" ? chrome : browser;

  const clickEventSource =
    (api && api.browserAction && api.browserAction.onClicked) ||
    (api && api.action && api.action.onClicked);

  if (clickEventSource) {
    clickEventSource.addListener(() => {
      try {
        if (api.runtime && api.runtime.openOptionsPage) {
          api.runtime.openOptionsPage();
        }
      } catch (e) {
        // best-effort only
      }
    });
  }

  /**
   * Best-effort helper to call Google Gemini to summarize an email body.
   * The Gemini API key is read from extension storage (key: "geminiApiKey").
   *
   * @param {string} bodyText
   * @returns {Promise<{ ok: boolean; summary?: string; error?: string }>}
   */
  async function summarizeWithGemini(bodyText) {
    if (!bodyText || !bodyText.trim()) {
      return { ok: false, error: "No email content found to summarize." };
    }

    const storageGet = () =>
      new Promise((resolve) => {
        try {
          api.storage.sync.get({ geminiApiKey: "" }, (items) => {
            if (api.runtime && api.runtime.lastError) {
              resolve({ geminiApiKey: "" });
              return;
            }
            resolve(items || { geminiApiKey: "" });
          });
        } catch (e) {
          resolve({ geminiApiKey: "" });
        }
      });

    const items = await storageGet();
    const apiKey = (items && items.geminiApiKey) || "";
    if (!apiKey) {
      return {
        ok: false,
        error: "No Gemini API key configured. Open Zero for Outlook options to add one."
      };
    }

    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const instructions =
      "You are helping a busy email user quickly understand a single email." +
      "\n\nTask: Briefly summarize the most important details from the email below." +
      "\n- Focus on key decisions, requests, dates, and next steps." +
      "\n- Prefer 3–6 short bullet points." +
      "\n- Use plain language, no introductions or conclusions." +
      "\n- Do not invent information that is not present in the email text." +
      "\n\nEmail:\n\n" +
      bodyText.trim();

    try {
      const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: instructions }]
            }
          ]
        })
      });

      if (!res.ok) {
        return { ok: false, error: `Gemini API error (${res.status}) while summarizing.` };
      }

      const data = await res.json();
      const candidates = (data && data.candidates) || [];
      const first = candidates[0];
      const parts = first && first.content && first.content.parts;
      const textPart = parts && parts.find && parts.find((p) => typeof p.text === "string");
      const summary = (textPart && textPart.text && textPart.text.trim()) || "";

      if (!summary) {
        return { ok: false, error: "Gemini returned an empty summary." };
      }

      return { ok: true, summary };
    } catch (e) {
      return {
        ok: false,
        error: "Could not contact Gemini. Check your network connection and API key."
      };
    }
  }

  try {
    if (api.runtime && api.runtime.onMessage) {
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

        return undefined;
      });
    }
  } catch (e) {
    // best-effort only
  }
})();


