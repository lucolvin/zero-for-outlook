// Background script for Outlook Web Keyboard Shortcuts (Manifest V2)
// Clicking the toolbar icon opens the options page in a full tab.

(() => {
  const api = typeof chrome !== "undefined" ? chrome : browser;
  const AUTH_SESSION_KEY = "ozAuthSession";
  const PENDING_AUTH_KEY = "ozPendingAuth";
  const CLOUD_SYNC_ENABLED_KEY = "cloudSyncEnabled";
  const SYNC_META_KEY = "syncMeta";
  const DEFAULT_AUTH_SITE_URL = "__OZ_AUTH_SITE_URL__";
  const DEFAULT_API_BASE_URL = "__OZ_API_BASE_URL__";
  const SETTINGS_DEFAULTS = {
    undoShortcut: {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: "z"
    },
    commandShortcut: {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: true,
      key: "k"
    },
    blockedContentShortcut: {
      ctrlKey: false,
      altKey: false,
      shiftKey: true,
      metaKey: true,
      key: "b"
    },
    vimEnabled: true,
    darkModeEnabled: true,
    oledModeEnabled: false,
    accentColor: "#6366f1",
    popupOpacity: 95,
    backdropBlurEnabled: true,
    inboxZeroEnabled: true,
    archivePopupEnabled: true,
    optionsBarHidden: false,
    vimContext: "auto",
    customShortcuts: [],
    aiTitleEditingEnabled: true,
    geminiApiKey: "",
    inboxZeroStreak: {
      days: 0,
      lastHitDate: null,
      lastOverlayDate: null
    },
    manualShortcutAdvancedWarningShown: false
  };
  const SYNCED_KEYS = Object.keys(SETTINGS_DEFAULTS);

  function randomHex(bytes = 24) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function storageLocalGet(defaults) {
    return new Promise((resolve) => {
      try {
        api.storage.local.get(defaults, (items) => {
          resolve(items || defaults);
        });
      } catch (e) {
        resolve(defaults);
      }
    });
  }

  function storageLocalSet(values) {
    return new Promise((resolve) => {
      try {
        api.storage.local.set(values, () => resolve(true));
      } catch (e) {
        resolve(false);
      }
    });
  }

  function storageSyncGet(defaults) {
    return new Promise((resolve) => {
      try {
        api.storage.sync.get(defaults, (items) => {
          resolve(items || defaults);
        });
      } catch (e) {
        resolve(defaults);
      }
    });
  }

  function storageSyncSet(values) {
    return new Promise((resolve) => {
      try {
        api.storage.sync.set(values, () => resolve(true));
      } catch (e) {
        resolve(false);
      }
    });
  }

  async function getCloudConfig() {
    return {
      authSiteUrl: DEFAULT_AUTH_SITE_URL,
      apiBaseUrl: DEFAULT_API_BASE_URL
    };
  }

  function getFetchErrorMessage(error) {
    try {
      return (error && (error.message || String(error))) || "Unknown network error";
    } catch (_) {
      return "Unknown network error";
    }
  }

  async function fetchAccountProfile(extensionToken) {
    if (!extensionToken) return null;
    const { apiBaseUrl } = await getCloudConfig();

    try {
      const response = await fetchJsonWithAuth(
        `${apiBaseUrl}/auth/me`,
        extensionToken,
        { method: "GET" }
      );
      const profile = response && response.profile ? response.profile : null;
      if (!profile) return null;
      return {
        name: String(profile.name || "").trim() || "Account",
        imageUrl: String(profile.imageUrl || "").trim()
      };
    } catch (_) {
      return null;
    }
  }

  function hasMeaningfulLocalConfig(localDoc) {
    if (!localDoc || !localDoc.values) return false;
    return SYNCED_KEYS.some((key) => {
      const current = localDoc.values[key];
      const defaultValue = SETTINGS_DEFAULTS[key];
      try {
        return JSON.stringify(current) !== JSON.stringify(defaultValue);
      } catch (_) {
        return current !== defaultValue;
      }
    });
  }

  function docsDifferByValues(localDoc, remoteDoc) {
    const localValues = (localDoc && localDoc.values) || {};
    const remoteValues = (remoteDoc && remoteDoc.values) || {};
    return SYNCED_KEYS.some((key) => {
      try {
        return JSON.stringify(localValues[key]) !== JSON.stringify(remoteValues[key]);
      } catch (_) {
        return localValues[key] !== remoteValues[key];
      }
    });
  }

  function normalizeSettingsDoc(doc) {
    const base = doc || {};
    return {
      values: {
        ...SETTINGS_DEFAULTS,
        ...(base.values || {})
      },
      fieldUpdatedAt: {
        ...(base.fieldUpdatedAt || {})
      },
      settingsRevision: Number(base.settingsRevision || 0),
      updatedAt: Number(base.updatedAt || Date.now())
    };
  }

  async function fetchJsonWithAuth(url, token, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      payload = null;
    }

    if (!res.ok) {
      const message =
        (payload && payload.error) ||
        `Request failed (${res.status})`;
      throw new Error(message);
    }
    return payload || {};
  }

  async function getAuthStatus() {
    const items = await storageLocalGet({
      [AUTH_SESSION_KEY]: null,
      [PENDING_AUTH_KEY]: null,
      [CLOUD_SYNC_ENABLED_KEY]: false
    });
    const authSession = items[AUTH_SESSION_KEY];
    const pending = items[PENDING_AUTH_KEY];
    const now = Date.now();
    const signedIn = !!(authSession && authSession.token && authSession.expiresAt > now);

    return {
      ok: true,
      signedIn,
      authSession: signedIn ? authSession : null,
      pendingAuth: pending,
      cloudSyncEnabled: !!items[CLOUD_SYNC_ENABLED_KEY]
    };
  }

  async function openSignInFlow(flowOptions = {}) {
    const preferTab = flowOptions.preferTab === true;
    const { authSiteUrl } = await getCloudConfig();
    const deviceCode = randomHex(16);
    const pending = {
      deviceCode,
      startedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 10
    };
    await storageLocalSet({ [PENDING_AUTH_KEY]: pending });
    const url = `${authSiteUrl}/extension-link?device_code=${encodeURIComponent(deviceCode)}`;

    function openSignInTab() {
      return new Promise((resolve, reject) => {
        try {
          if (!api.tabs || !api.tabs.create) {
            reject(new Error("tabs.create unavailable."));
            return;
          }
          api.tabs.create({ url }, () => {
            if (api.runtime && api.runtime.lastError) {
              reject(new Error(api.runtime.lastError.message));
              return;
            }
            resolve(true);
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    function openSignInPopupWindow() {
      return new Promise((resolve) => {
        try {
          if (!api.windows || !api.windows.create) {
            resolve(false);
            return;
          }
          api.windows.create(
            {
              url,
              type: "popup",
              width: 460,
              height: 780,
              focused: true
            },
            (created) => {
              if ((api.runtime && api.runtime.lastError) || !created) {
                resolve(false);
                return;
              }
              resolve(true);
            }
          );
        } catch (e) {
          resolve(false);
        }
      });
    }

    try {
      if (!preferTab) {
        const openedPopup = await openSignInPopupWindow();
        if (openedPopup) {
          return { ok: true, pending, window: "popup" };
        }
      }
      await openSignInTab();
      return { ok: true, pending, window: "tab" };
    } catch (e) {
      const msg = preferTab ? "Could not open sign-in tab." : "Could not open sign-in window.";
      return { ok: false, error: msg };
    }
  }

  async function setCloudSyncEnabled(enabled) {
    const status = await getAuthStatus();
    if (!status.signedIn) {
      return { ok: false, error: "Sign in before changing cloud sync." };
    }
    await storageLocalSet({ [CLOUD_SYNC_ENABLED_KEY]: !!enabled });
    return { ok: true, cloudSyncEnabled: !!enabled };
  }

  async function tryClaimPendingSession() {
    const local = await storageLocalGet({ [PENDING_AUTH_KEY]: null });
    const pending = local[PENDING_AUTH_KEY];
    if (!pending || !pending.deviceCode) {
      return { ok: false, state: "none" };
    }
    if (pending.expiresAt <= Date.now()) {
      await storageLocalSet({ [PENDING_AUTH_KEY]: null });
      return { ok: false, state: "expired", error: "Sign-in window expired. Start sign-in again." };
    }

    const { apiBaseUrl } = await getCloudConfig();
    try {
      const res = await fetch(
        `${apiBaseUrl}/auth/extension-token/claim?device_code=${encodeURIComponent(pending.deviceCode)}`
      );
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, state: data.state || "error", error: data.error || "Could not claim session." };
      }
      if (!data || data.state !== "claimed" || !data.extensionToken) {
        return { ok: true, state: "pending" };
      }

      await storageLocalSet({
        [AUTH_SESSION_KEY]: {
          token: data.extensionToken,
          expiresAt: data.expiresAt || Date.now() + 1000 * 60 * 30,
          issuedAt: Date.now()
        },
        [PENDING_AUTH_KEY]: null,
        [CLOUD_SYNC_ENABLED_KEY]: true
      });
      return { ok: true, state: "claimed" };
    } catch (e) {
      return { ok: false, state: "error", error: "Network error while claiming sign-in." };
    }
  }

  async function openClerkLogoutPopupOrTabBestEffort() {
    const { authSiteUrl } = await getCloudConfig();
    const base = String(authSiteUrl || "").replace(/\/$/, "");
    if (!base) return;
    const url = `${base}/logout`;

    async function openLogoutPopupWindow() {
      return new Promise((resolve) => {
        try {
          if (!api.windows || !api.windows.create) {
            resolve(false);
            return;
          }
          api.windows.create(
            {
              url,
              type: "popup",
              width: 460,
              height: 780,
              focused: true
            },
            (created) => {
              if ((api.runtime && api.runtime.lastError) || !created) {
                resolve(false);
                return;
              }
              resolve(true);
            }
          );
        } catch (e) {
          resolve(false);
        }
      });
    }

    async function openLogoutTab() {
      await new Promise((resolve, reject) => {
        try {
          if (!api.tabs || !api.tabs.create) {
            reject(new Error("tabs.create unavailable."));
            return;
          }
          api.tabs.create({ url, active: true }, () => {
            if (api.runtime && api.runtime.lastError) {
              reject(new Error(api.runtime.lastError.message));
              return;
            }
            resolve(true);
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    const openedPopup = await openLogoutPopupWindow();
    if (openedPopup) return;
    try {
      await openLogoutTab();
    } catch (e) {
      // Host permissions or tab API unavailable — extension session still cleared locally.
    }
  }

  async function signOut(flowOptions = {}) {
    await storageLocalSet({
      [AUTH_SESSION_KEY]: null,
      [PENDING_AUTH_KEY]: null,
      [CLOUD_SYNC_ENABLED_KEY]: false
    });
    if (flowOptions && flowOptions.clerkLogout) {
      await openClerkLogoutPopupOrTabBestEffort();
    }
    return { ok: true };
  }

  async function getLocalSettingsDoc() {
    const items = await storageSyncGet({
      ...SETTINGS_DEFAULTS,
      [SYNC_META_KEY]: {
        fieldUpdatedAt: {},
        settingsRevision: 0,
        updatedAt: 0
      }
    });
    const values = {};
    for (const key of SYNCED_KEYS) {
      if (Object.prototype.hasOwnProperty.call(items, key)) {
        values[key] = items[key];
      }
    }
    const syncMeta = items[SYNC_META_KEY] || {};
    return {
      values,
      fieldUpdatedAt: syncMeta.fieldUpdatedAt || {},
      settingsRevision: Number(syncMeta.settingsRevision || 0),
      updatedAt: Number(syncMeta.updatedAt || 0)
    };
  }

  function mergeSettingsDocs(localDoc, remoteDoc) {
    if (!remoteDoc) return localDoc;

    const mergedValues = { ...(remoteDoc.values || {}) };
    const mergedFieldUpdatedAt = { ...(remoteDoc.fieldUpdatedAt || {}) };

    const keys = new Set([
      ...Object.keys(localDoc.values || {}),
      ...Object.keys(remoteDoc.values || {})
    ]);

    keys.forEach((key) => {
      const localAt = Number((localDoc.fieldUpdatedAt || {})[key] || 0);
      const remoteAt = Number((remoteDoc.fieldUpdatedAt || {})[key] || 0);
      const localHasKey = Object.prototype.hasOwnProperty.call(localDoc.values || {}, key);
      const remoteHasKey = Object.prototype.hasOwnProperty.call(remoteDoc.values || {}, key);

      // If both sides are missing per-key timestamps, prefer existing remote values
      // so cloud data can hydrate a freshly linked device.
      if (localAt === 0 && remoteAt === 0) {
        if (remoteHasKey) {
          mergedValues[key] = (remoteDoc.values || {})[key];
          mergedFieldUpdatedAt[key] = 0;
        } else if (localHasKey) {
          mergedValues[key] = (localDoc.values || {})[key];
          mergedFieldUpdatedAt[key] = 0;
        }
        return;
      }

      if (localAt >= remoteAt) {
        mergedValues[key] = (localDoc.values || {})[key];
        mergedFieldUpdatedAt[key] = localAt || Date.now();
      } else {
        mergedValues[key] = (remoteDoc.values || {})[key];
        mergedFieldUpdatedAt[key] = remoteAt;
      }
    });

    return {
      values: mergedValues,
      fieldUpdatedAt: mergedFieldUpdatedAt,
      settingsRevision: Math.max(
        Number(localDoc.settingsRevision || 0),
        Number(remoteDoc.settingsRevision || 0)
      ),
      updatedAt: Date.now()
    };
  }

  async function writeMergedSettingsDoc(doc) {
    const toWrite = { [SYNC_META_KEY]: {
      fieldUpdatedAt: doc.fieldUpdatedAt || {},
      settingsRevision: Number(doc.settingsRevision || 0),
      updatedAt: Number(doc.updatedAt || Date.now())
    } };
    for (const key of SYNCED_KEYS) {
      if (Object.prototype.hasOwnProperty.call(doc.values || {}, key)) {
        toWrite[key] = doc.values[key];
      }
    }
    await storageSyncSet(toWrite);
  }

  async function pushLocalToCloud() {
    const status = await getAuthStatus();
    if (!status.signedIn || !status.authSession || !status.authSession.token) {
      return { ok: false, error: "Not signed in." };
    }
    if (!status.cloudSyncEnabled) {
      return { ok: false, error: "Cloud sync is disabled for this install." };
    }
    const { apiBaseUrl } = await getCloudConfig();
    const localDoc = await getLocalSettingsDoc();

    try {
      await fetchJsonWithAuth(
        `${apiBaseUrl}/settings`,
        status.authSession.token,
        {
          method: "PUT",
          body: JSON.stringify({ settings: localDoc })
        }
      );
      return { ok: true, pushedAt: Date.now() };
    } catch (e) {
      const primaryError = getFetchErrorMessage(e);
      if (apiBaseUrl !== DEFAULT_API_BASE_URL) {
        try {
          await fetchJsonWithAuth(
            `${DEFAULT_API_BASE_URL}/settings`,
            status.authSession.token,
            {
              method: "PUT",
              body: JSON.stringify({ settings: localDoc })
            }
          );
          return {
            ok: true,
            pushedAt: Date.now(),
            warning: `Primary API URL failed (${apiBaseUrl}). Pushed via localhost fallback.`
          };
        } catch (fallbackError) {
          return {
            ok: false,
            error: `Push failed for ${apiBaseUrl} (${primaryError}) and localhost fallback (${getFetchErrorMessage(fallbackError)}).`
          };
        }
      }
      return { ok: false, error: `Push failed at ${apiBaseUrl}: ${primaryError}` };
    }
  }

  async function pullCloudToLocal(options = {}) {
    const status = await getAuthStatus();
    if (!status.signedIn || !status.authSession || !status.authSession.token) {
      return { ok: false, error: "Not signed in." };
    }
    if (!status.cloudSyncEnabled) {
      return { ok: false, error: "Cloud sync is disabled for this install." };
    }
    const { apiBaseUrl } = await getCloudConfig();
    const localDoc = await getLocalSettingsDoc();
    const overwriteLocal = !!options.overwriteLocal;

    try {
      const remoteGet = await fetchJsonWithAuth(
        `${apiBaseUrl}/settings`,
        status.authSession.token,
        { method: "GET" }
      );
      const remoteDoc = remoteGet && remoteGet.settings ? normalizeSettingsDoc(remoteGet.settings) : null;

      if (!remoteDoc) {
        return { ok: false, error: "No cloud settings found for this account." };
      }

      if (overwriteLocal) {
        await writeMergedSettingsDoc(remoteDoc);
        return { ok: true, pulledAt: Date.now(), mode: "overwrite_local" };
      }

      if (remoteDoc && hasMeaningfulLocalConfig(localDoc) && docsDifferByValues(localDoc, remoteDoc)) {
        return {
          ok: false,
          requiresConfirmation: true,
          error:
            "This browser already has local settings that differ from cloud settings. Confirm overwrite to apply cloud settings to this browser."
        };
      }

      await writeMergedSettingsDoc(remoteDoc);
      return { ok: true, pulledAt: Date.now() };
    } catch (e) {
      const primaryError = getFetchErrorMessage(e);
      if (apiBaseUrl !== DEFAULT_API_BASE_URL) {
        try {
          const remoteGet = await fetchJsonWithAuth(
            `${DEFAULT_API_BASE_URL}/settings`,
            status.authSession.token,
            { method: "GET" }
          );
          const remoteDoc = remoteGet && remoteGet.settings ? normalizeSettingsDoc(remoteGet.settings) : null;

          if (overwriteLocal) {
            if (!remoteDoc) {
              return { ok: false, error: "No cloud settings found for this account." };
            }
            await writeMergedSettingsDoc(remoteDoc);
            return { ok: true, pulledAt: Date.now(), mode: "overwrite_local" };
          }

          if (remoteDoc && hasMeaningfulLocalConfig(localDoc) && docsDifferByValues(localDoc, remoteDoc)) {
            return {
              ok: false,
              requiresConfirmation: true,
              error:
                "This browser already has local settings that differ from cloud settings. Confirm overwrite to apply cloud settings to this browser."
            };
          }

          if (!remoteDoc) {
            return { ok: false, error: "No cloud settings found for this account." };
          }

          await writeMergedSettingsDoc(remoteDoc);
          return {
            ok: true,
            pulledAt: Date.now(),
            warning: `Primary API URL failed (${apiBaseUrl}). Pulled via localhost fallback.`
          };
        } catch (fallbackError) {
          return {
            ok: false,
            error: `Sync failed for ${apiBaseUrl} (${primaryError}) and localhost fallback (${getFetchErrorMessage(fallbackError)}).`
          };
        }
      }
      return { ok: false, error: `Sync failed at ${apiBaseUrl}: ${primaryError}` };
    }
  }

  try {
    api.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== "sync") return;
      const changedKeys = Object.keys(changes || {}).filter((k) => k !== SYNC_META_KEY);
      if (changedKeys.length === 0) return;

      const items = await storageSyncGet({
        [SYNC_META_KEY]: {
          fieldUpdatedAt: {},
          settingsRevision: 0,
          updatedAt: 0
        }
      });
      const previous = items[SYNC_META_KEY] || {};
      const fieldUpdatedAt = { ...(previous.fieldUpdatedAt || {}) };
      const now = Date.now();
      changedKeys.forEach((key) => {
        if (SYNCED_KEYS.includes(key)) {
          fieldUpdatedAt[key] = now;
        }
      });
      await storageSyncSet({
        [SYNC_META_KEY]: {
          fieldUpdatedAt,
          settingsRevision: Number(previous.settingsRevision || 0) + 1,
          updatedAt: now
        }
      });
    });
  } catch (e) {
    // best-effort only
  }

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
   * Best-effort helper to call Google Gemini to format an element description.
   * The Gemini API key is read from extension storage (key: "geminiApiKey").
   *
   * @param {Object} elementInfo - Object containing element information
   * @param {string} elementInfo.selector - CSS selector for the element
   * @param {string} elementInfo.currentDescription - Current description from DOM
   * @param {string} elementInfo.tagName - HTML tag name
   * @param {string} elementInfo.ariaLabel - aria-label attribute
   * @param {string} elementInfo.title - title attribute
   * @param {string} elementInfo.textContent - Text content of the element
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

    // Gemma 3 4B IT endpoint
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

      // Try to parse JSON from the response
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;
        const parsed = JSON.parse(jsonText);
        
        if (parsed.title && parsed.description) {
          return { ok: true, title: parsed.title.trim(), description: parsed.description.trim() };
        }
      } catch (e) {
        // If JSON parsing fails, try to extract title and description from text
        const lines = responseText.split("\n").filter(l => l.trim());
        const titleLine = lines.find(l => l.toLowerCase().includes("title") || l.match(/^["']/));
        const descLine = lines.find(l => l.toLowerCase().includes("description") || l.toLowerCase().includes("desc"));
        
        if (titleLine) {
          const titleMatch = titleLine.match(/["']([^"']+)["']/);
          const title = titleMatch ? titleMatch[1] : titleLine.replace(/title:?\s*/i, "").trim();
          const desc = descLine ? (descLine.match(/["']([^"']+)["']/) || [])[1] || descLine.replace(/description:?\s*/i, "").trim() : title;
          
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
            if (api.runtime && api.runtime.openOptionsPage) {
              api.runtime.openOptionsPage();
              // Store the shortcut ID to scroll to after page loads
              if (message.shortcutId) {
                // Use storage to pass the shortcut ID to the options page
                api.storage.local.set({ scrollToShortcutId: message.shortcutId }, () => {
                  // Ignore errors
                });
              }
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

        if (message.type === "oz-auth-open-signin") {
          openSignInFlow({ preferTab: !!message.preferTab }).then((result) => {
            sendResponse(result);
          });
          return true;
        }

        if (message.type === "oz-set-cloud-sync-enabled") {
          setCloudSyncEnabled(!!message.enabled).then((result) => sendResponse(result));
          return true;
        }

        if (message.type === "oz-auth-get-status") {
          Promise.resolve()
            .then(async () => {
              const claimed = await tryClaimPendingSession();
              const status = await getAuthStatus();
              const profile =
                status && status.signedIn && status.authSession && status.authSession.token
                  ? await fetchAccountProfile(status.authSession.token)
                  : null;
              return {
                ...status,
                claimState: claimed.state || "none",
                claimError: claimed.error || null,
                profile
              };
            })
            .then((result) => sendResponse(result));
          return true;
        }

        if (message.type === "oz-auth-signout") {
          signOut({ clerkLogout: !!message.clerkLogout }).then((result) =>
            sendResponse(result)
          );
          return true;
        }

        if (message.type === "oz-sync-now") {
          pullCloudToLocal({
            overwriteLocal: !!message.overwriteLocal
          }).then((result) => sendResponse(result));
          return true;
        }

        if (message.type === "oz-sync-push") {
          pushLocalToCloud().then((result) => sendResponse(result));
          return true;
        }

        return undefined;
      });
    }
  } catch (e) {
    // best-effort only
  }
})();

