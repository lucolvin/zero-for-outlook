(() => {
  // zero-for-outlook-chrome/src/background/optionsNavigation.js
  var api = typeof chrome !== "undefined" ? chrome : browser;
  function openOptionsPage() {
    try {
      if (api.runtime && api.runtime.openOptionsPage) {
        api.runtime.openOptionsPage();
      }
    } catch (e) {
    }
  }
  function registerActionClick() {
    const clickEventSource = api && api.browserAction && api.browserAction.onClicked || api && api.action && api.action.onClicked;
    if (!clickEventSource) return;
    clickEventSource.addListener(() => {
      openOptionsPage();
    });
  }

  // zero-for-outlook-chrome/src/background/geminiClient.js
  var api2 = typeof chrome !== "undefined" ? chrome : browser;
  async function summarizeWithGemini(bodyText) {
    if (!bodyText || !bodyText.trim()) {
      return { ok: false, error: "No email content found to summarize." };
    }
    const storageGet = () => new Promise((resolve) => {
      try {
        api2.storage.sync.get({ geminiApiKey: "" }, (items2) => {
          if (api2.runtime && api2.runtime.lastError) {
            resolve({ geminiApiKey: "" });
            return;
          }
          resolve(items2 || { geminiApiKey: "" });
        });
      } catch (e) {
        resolve({ geminiApiKey: "" });
      }
    });
    const items = await storageGet();
    const apiKey = items && items.geminiApiKey || "";
    if (!apiKey) {
      return {
        ok: false,
        error: "No Gemini API key configured. Open Zero for Outlook options to add one."
      };
    }
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent";
    const instructions = "You are helping a busy email user quickly understand an email conversation (thread).\n\nTask: Briefly summarize the most important details from the conversation below.\n- Treat the text as a full thread, not just one message.\n- Focus on key decisions, requests, dates, and next steps across the whole conversation.\n- Make sure the summary reflects the latest message while using earlier messages for context.\n- Prefer 3\u20136 short bullet points.\n- Use plain language, no introductions or conclusions.\n- Do not invent information that is not present in the text.\n\nConversation:\n\n" + bodyText.trim();
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
      const candidates = data && data.candidates || [];
      const first = candidates[0];
      const parts = first && first.content && first.content.parts;
      const textPart = parts && parts.find && parts.find((p) => typeof p.text === "string");
      const summary = textPart && textPart.text && textPart.text.trim() || "";
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

  // zero-for-outlook-chrome/src/background/messageRouter.js
  var api3 = typeof chrome !== "undefined" ? chrome : browser;
  function registerMessageListener() {
    if (!api3.runtime || !api3.runtime.onMessage) return;
    api3.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || !message.type) {
        return;
      }
      if (message.type === "oz-summarize-email") {
        const bodyText = message.bodyText || "";
        summarizeWithGemini(bodyText).then((result) => {
          try {
            sendResponse(result);
          } catch (e) {
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
      return void 0;
    });
  }

  // zero-for-outlook-chrome/src/background/index.js
  (() => {
    try {
      registerActionClick();
    } catch (e) {
    }
    try {
      registerMessageListener();
    } catch (e) {
    }
  })();
})();
