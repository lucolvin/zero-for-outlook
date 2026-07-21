// @ts-nocheck
// Background script for Zero for Outlook (local-only settings).
// Toolbar icon and command-bar "oz-open-options" open settings.html in a new tab.

(() => {
  const api = typeof chrome !== "undefined" ? chrome : browser;

  // Clear leftover cloud-account keys from earlier builds (best-effort).
  const LEGACY_CLOUD_KEYS = [
    "ozAuthSession",
    "ozPendingAuth",
    "cloudSyncEnabled",
    "ozSidePanelNavigateUrl",
    "ozCloudAccountOptIn",
    "ozLastSyncedAt",
    "ozLocalOnlyMode",
    "syncMeta"
  ];
  try {
    api.storage.local.remove(LEGACY_CLOUD_KEYS, () => {});
    api.storage.sync.remove(["syncMeta"], () => {});
  } catch (_e) {
    // ignore
  }

  const clickEventSource =
    (api && api.browserAction && api.browserAction.onClicked) ||
    (api && api.action && api.action.onClicked);

  if (clickEventSource) {
    clickEventSource.addListener(() => {
      try {
        if (api.runtime && api.runtime.getURL && api.tabs && api.tabs.create) {
          api.tabs.create({ url: api.runtime.getURL("settings.html") }, () => {
            if (api.runtime && api.runtime.lastError && api.runtime.openOptionsPage) {
              api.runtime.openOptionsPage();
            }
          });
          return;
        }
        if (api.runtime && api.runtime.openOptionsPage) {
          api.runtime.openOptionsPage();
        }
      } catch (e) {
        // best-effort only
      }
    });
  }

  /**
   * Best-effort helper to call Google Gemini to format an element description.
   * The Gemini API key is read from extension storage (key: "geminiApiKey").
   *
   * @param {Object} elementInfo - Object containing element information
   * @returns {Promise<{ ok: boolean; title?: string; description?: string; error?: string }>}
   */
  async function formatElementDescriptionWithGemini(elementInfo) {
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
        error: "No Gemini API key configured."
      };
    }

    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent";

    const context = [];
    if (elementInfo.ariaLabel) context.push(`aria-label: "${elementInfo.ariaLabel}"`);
    if (elementInfo.title) context.push(`title: "${elementInfo.title}"`);
    if (elementInfo.textContent) {
      const text = elementInfo.textContent.trim().substring(0, 200);
      if (text) context.push(`text content: "${text}"`);
    }
    if (elementInfo.tagName) context.push(`tag: ${elementInfo.tagName}`);
    if (elementInfo.role) context.push(`role: ${elementInfo.role}`);

    const instructions =
      "You are helping format a keyboard shortcut name and description for a UI element." +
      "\n\nTask: Create a concise, user-friendly title and description for this UI element." +
      "\n- The title should be 2-5 words, clear and action-oriented (e.g., 'Send email', 'Archive message', 'Open settings')" +
      "\n- The description should be a brief one-line explanation of what the action does" +
      "\n- Use title case for the title" +
      "\n- Keep it simple and intuitive" +
      "\n- Respond ONLY with a JSON object in this exact format: {\"title\": \"...\", \"description\": \"...\"}" +
      "\n\nElement information:\n" +
      context.join("\n") +
      (elementInfo.currentDescription ? `\n\nCurrent description: "${elementInfo.currentDescription}"` : "");

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
        return { ok: false, error: `Gemini API error (${res.status}) while formatting description.` };
      }

      const data = await res.json();
      const candidates = (data && data.candidates) || [];
      const first = candidates[0];
      const parts = first && first.content && first.content.parts;
      const textPart = parts && parts.find && parts.find((p) => typeof p.text === "string");
      const responseText = (textPart && textPart.text && textPart.text.trim()) || "";

      if (!responseText) {
        return { ok: false, error: "Gemini returned an empty response." };
      }

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;
        const parsed = JSON.parse(jsonText);

        if (parsed.title && parsed.description) {
          return { ok: true, title: parsed.title.trim(), description: parsed.description.trim() };
        }
      } catch (e) {
        const lines = responseText.split("\n").filter((l) => l.trim());
        const titleLine = lines.find((l) => l.toLowerCase().includes("title") || l.match(/^["']/));
        const descLine = lines.find(
          (l) => l.toLowerCase().includes("description") || l.toLowerCase().includes("desc")
        );

        if (titleLine) {
          const titleMatch = titleLine.match(/["']([^"']+)["']/);
          const title = titleMatch ? titleMatch[1] : titleLine.replace(/title:?\s*/i, "").trim();
          const desc = descLine
            ? (descLine.match(/["']([^"']+)["']/) || [])[1] ||
              descLine.replace(/description:?\s*/i, "").trim()
            : title;

          if (title) {
            return { ok: true, title: title, description: desc || title };
          }
        }
      }

      return { ok: false, error: "Could not parse Gemini response." };
    } catch (e) {
      return {
        ok: false,
        error: "Could not contact Gemini. Check your network connection and API key."
      };
    }
  }

  /**
   * Best-effort helper to call Google Gemini to summarize an email body.
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
      return { ok: false, error: "No Gemini API key configured." };
    }

    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent";

    const instructions =
      "You are helping a busy email user quickly understand an email conversation (thread)." +
      "\n\nTask: Briefly summarize the most important details from the conversation below." +
      "\n- Treat the text as a full thread, not just one message." +
      "\n- Focus on key decisions, requests, dates, and next steps across the whole conversation." +
      "\n- Make sure the summary reflects the latest message while using earlier messages for context." +
      "\n- Prefer 3–6 short bullet points." +
      "\n- Use plain language, no introductions or conclusions." +
      "\n- Do not invent information that is not present in the text." +
      "\n\nConversation:\n\n" +
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

        if (message.type === "oz-open-options") {
          try {
            if (message.shortcutId && api.storage && api.storage.local && api.storage.local.set) {
              api.storage.local.set({ scrollToShortcutId: message.shortcutId }, () => {});
            }

            const optionsHash =
              typeof message.hash === "string" && message.hash
                ? message.hash.startsWith("#")
                  ? message.hash
                  : `#${message.hash}`
                : "";

            if (api.runtime && api.runtime.getURL && api.tabs && api.tabs.create) {
              api.tabs.create({ url: api.runtime.getURL("settings.html") + optionsHash }, () => {
                if (api.runtime && api.runtime.lastError && api.runtime.openOptionsPage) {
                  api.runtime.openOptionsPage();
                }
              });
            } else if (api.runtime && api.runtime.openOptionsPage) {
              api.runtime.openOptionsPage();
            }
            sendResponse({ ok: true });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
          return true;
        }

        if (message.type === "oz-format-element-description") {
          const elementInfo = message.elementInfo || {};
          formatElementDescriptionWithGemini(elementInfo).then((result) => {
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
