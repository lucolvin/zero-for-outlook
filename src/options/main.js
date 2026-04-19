// Outlook Web Keyboard Shortcuts - Options Page

(() => {
  const browserApi = typeof chrome !== "undefined" ? chrome : browser;

  const DEFAULT_UNDO_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: "z"
  };
  const DEFAULT_COMMAND_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: true,
    key: "k"
  };
  const DEFAULT_BLOCKED_CONTENT_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: true,
    metaKey: true,
    key: "b"
  };

  const shortcutInput = document.getElementById("undoShortcut");
  const commandShortcutInput = document.getElementById("commandShortcut");
  const blockedContentShortcutInput = document.getElementById("blockedContentShortcut");
  const undoStatusEl = document.getElementById("status");
  const commandStatusEl = document.getElementById("status-command");
  const blockedContentStatusEl = document.getElementById("status-blocked-content");
  const vimStatusEl = document.getElementById("status-vim");
  const darkStatusEl = document.getElementById("status-dark");
  const inboxZeroStatusEl = document.getElementById("status-inbox-zero");
  const geminiStatusEl = document.getElementById("status-gemini");
  const clearBtn = document.getElementById("clearUndo");
  const clearCommandBtn = document.getElementById("clearCommand");
  const clearBlockedContentBtn = document.getElementById("clearBlockedContent");
  const vimToggle = document.getElementById("vimEnabled");
  const darkToggle = document.getElementById("darkModeEnabled");
  const inboxZeroToggle = document.getElementById("inboxZeroEnabled");
  const geminiInput = document.getElementById("geminiApiKey");
  const saveGeminiBtn = document.getElementById("saveGeminiKey");
  const clearGeminiBtn = document.getElementById("clearGeminiKey");
  const customShortcutsList = document.getElementById("customShortcutsList");
  const customStatusEl = document.getElementById("status-custom");
  const manualAddCustomShortcutBtn = document.getElementById("manualAddCustomShortcut");
  const aiTitleEditingToggle = document.getElementById("aiTitleEditingEnabled");
  const aiTitleEditingStatusEl = document.getElementById("status-ai-title-editing");
  const MANUAL_SHORTCUT_WARNING_KEY = "manualShortcutAdvancedWarningShown";

  const PAGE_LEDES = {
    general:
      "Configure keyboard shortcuts, navigation, appearance, and optional AI features.",
    custom: "Manage custom shortcuts and optional LLM-generated names.",
    ai: "Optional Gemini integration for summarizing the current email.",
    about: "How the extension works, privacy, and links.",
    "import-export": "Back up or restore your extension settings as a JSON file."
  };

  const tabButtons = document.querySelectorAll(".oz-tab[data-panel]");

  function setPageLede(panelId) {
    const el = document.getElementById("oz-page-lede");
    if (!el) return;
    const text = PAGE_LEDES[panelId] || PAGE_LEDES.general;
    el.textContent = text;
  }

  function exportSettingsAndShortcuts() {
    try {
      browserApi.storage.sync.get(null, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          window.alert(
            "Could not read settings: " + (browserApi.runtime.lastError.message || "storage error")
          );
          return;
        }
        const payload = {
          meta: {
            exportVersion: 1,
            exportedAt: new Date().toISOString(),
            extension: "zero-for-outlook"
          },
          sync: items && typeof items === "object" ? items : {}
        };
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `zero-for-outlook-settings-${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      window.alert("Export failed.");
    }
  }

  function extractSyncPayloadFromImport(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    if (parsed.sync && typeof parsed.sync === "object" && !Array.isArray(parsed.sync)) {
      return parsed.sync;
    }
    const hintKeys = [
      "undoShortcut",
      "commandShortcut",
      "blockedContentShortcut",
      "vimEnabled",
      "darkModeEnabled",
      "inboxZeroEnabled",
      "optionsBarHidden",
      "customShortcuts",
      "geminiApiKey",
      "aiTitleEditingEnabled",
      "manualShortcutAdvancedWarningShown"
    ];
    if (hintKeys.some((k) => Object.prototype.hasOwnProperty.call(parsed, k))) {
      return parsed;
    }
    return null;
  }

  function applyImportedSyncPayload(syncPayload) {
    browserApi.storage.sync.clear(() => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        window.alert(
          "Could not clear settings before import: " +
            (browserApi.runtime.lastError.message || "storage error")
        );
        return;
      }
      browserApi.storage.sync.set(syncPayload, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          window.alert(
            "Could not save imported settings: " +
              (browserApi.runtime.lastError.message || "storage error")
          );
          return;
        }
        restoreOptions();
        loadCustomShortcuts();
        window.alert("Settings imported successfully.");
      });
    });
  }

  function importSettingsFromJsonText(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      window.alert("This file is not valid JSON.");
      return;
    }
    const syncPayload = extractSyncPayloadFromImport(parsed);
    if (!syncPayload || typeof syncPayload !== "object") {
      window.alert(
        "Unrecognized backup format. Use a JSON file exported from Zero for Outlook (or a plain sync object with known keys)."
      );
      return;
    }
    if (
      !window.confirm(
        "Replace all extension settings with this file? Current settings will be removed. This cannot be undone."
      )
    ) {
      return;
    }
    applyImportedSyncPayload(syncPayload);
  }

  function wireImportSettingsUi() {
    const trigger = document.getElementById("importSettingsTrigger");
    const fileInput = document.getElementById("importSettingsFile");
    if (!trigger || !fileInput) return;

    trigger.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = typeof e.target?.result === "string" ? e.target.result : "";
        if (!text) {
          window.alert("Could not read file.");
          return;
        }
        importSettingsFromJsonText(text);
      };
      reader.onerror = () => {
        window.alert("Could not read file.");
      };
      reader.readAsText(file);
    });
  }

  function activatePanel(panelId) {
    if (!panelId) return;

    tabButtons.forEach((tab) => {
      const active = tab.getAttribute("data-panel") === panelId;
      tab.classList.toggle("oz-tab-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll(".oz-panel").forEach((panel) => {
      const id = panel.id && panel.id.startsWith("panel-") ? panel.id.slice("panel-".length) : "";
      const active = id === panelId;
      panel.classList.toggle("oz-panel-active", active);
    });

    setPageLede(panelId);
  }

  function formatShortcut(shortcut) {
    if (!shortcut || !shortcut.key) return "Not set";

    const parts = [];
    if (shortcut.ctrlKey) parts.push("Ctrl");
    if (shortcut.altKey) parts.push("Alt");
    if (shortcut.shiftKey) parts.push("Shift");
    if (shortcut.metaKey) parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Meta");
    parts.push(shortcut.key.toUpperCase());

    return parts.join(" + ");
  }

  function setStatus(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add("oz-status-visible");
    setTimeout(() => {
      el.classList.remove("oz-status-visible");
    }, 2000);
  }

  function setUndoStatus(message) {
    setStatus(undoStatusEl, message);
  }

  function setCommandStatus(message) {
    setStatus(commandStatusEl, message);
  }

  function setBlockedContentStatus(message) {
    setStatus(blockedContentStatusEl, message);
  }

  function setVimStatus(message) {
    setStatus(vimStatusEl, message);
  }

  function setDarkStatus(message) {
    setStatus(darkStatusEl, message);
  }

  function setGeminiStatus(message) {
    setStatus(geminiStatusEl, message);
  }

  function setInboxZeroStatus(message) {
    setStatus(inboxZeroStatusEl, message);
  }

  function setCustomStatus(message) {
    setStatus(customStatusEl, message);
  }

  function saveVimEnabled(enabled) {
    try {
      browserApi.storage.sync.set({ vimEnabled: enabled }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setVimStatus("Could not update vim setting (storage error).");
          return;
        }
        setVimStatus(enabled ? "Vim navigation enabled." : "Vim navigation disabled.");
      });
    } catch (e) {
      setVimStatus("Could not update vim setting.");
    }
  }

  function applyTheme(darkEnabled) {
    const html = document.documentElement;
    const body = document.body;
    if (!html || !body) return;
    if (darkEnabled) {
      html.classList.add("oz-theme-dark");
      body.classList.add("oz-theme-dark");
    } else {
      html.classList.remove("oz-theme-dark");
      body.classList.remove("oz-theme-dark");
    }
  }

  function saveDarkModeEnabled(enabled) {
    try {
      browserApi.storage.sync.set({ darkModeEnabled: enabled }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setDarkStatus("Could not update dark mode (storage error).");
          return;
        }
        applyTheme(enabled);
        setDarkStatus(enabled ? "Dark mode enabled." : "Dark mode disabled.");
      });
    } catch (e) {
      setDarkStatus("Could not update dark mode.");
    }
  }

  function saveInboxZeroEnabled(enabled) {
    try {
      browserApi.storage.sync.set({ inboxZeroEnabled: enabled }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setInboxZeroStatus("Could not update inbox zero setting (storage error).");
          return;
        }
        setInboxZeroStatus(enabled ? "celebration enabled." : "celebration disabled.");
      });
    } catch (e) {
      setInboxZeroStatus("Could not update inbox zero setting.");
    }
  }

  function setAiTitleEditingStatus(message) {
    setStatus(aiTitleEditingStatusEl, message);
  }

  function saveAiTitleEditingEnabled(enabled) {
    try {
      browserApi.storage.sync.set({ aiTitleEditingEnabled: enabled }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setAiTitleEditingStatus("Could not update LLM title editing setting (storage error).");
          return;
        }
        setAiTitleEditingStatus(enabled ? "LLM title editing enabled." : "LLM title editing disabled.");
      });
    } catch (e) {
      setAiTitleEditingStatus("Could not update LLM title editing setting.");
    }
  }

  /** LLM shortcut names require a non-empty Gemini API key in the field (saved or unsaved). */
  function syncAiTitleEditingToggleGate() {
    if (!aiTitleEditingToggle || !geminiInput) return;
    const hasKey = !!geminiInput.value.trim();
    aiTitleEditingToggle.disabled = !hasKey;
    if (!hasKey && aiTitleEditingToggle.checked) {
      aiTitleEditingToggle.checked = false;
      try {
        browserApi.storage.sync.set({ aiTitleEditingEnabled: false }, () => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            return;
          }
          setAiTitleEditingStatus("LLM title editing disabled (add a Gemini API key to enable).");
        });
      } catch (e) {
        // ignore
      }
    }
  }

  function saveGeminiApiKey(value) {
    try {
      browserApi.storage.sync.set({ geminiApiKey: value || "" }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setGeminiStatus("Could not save Gemini API key (storage error).");
          return;
        }
        setGeminiStatus(value ? "Gemini API key saved." : "Gemini API key cleared.");
        syncAiTitleEditingToggleGate();
      });
    } catch (e) {
      setGeminiStatus("Could not save Gemini API key.");
    }
  }

  function saveShortcut(shortcut) {
    try {
      browserApi.storage.sync.set({ undoShortcut: shortcut }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setUndoStatus("Could not save shortcut (storage error).");
          return;
        }
        shortcutInput.value = formatShortcut(shortcut);
        setUndoStatus("Shortcut saved.");
      });
    } catch (e) {
      setUndoStatus("Could not save shortcut.");
    }
  }

  function saveCommandShortcut(shortcut) {
    try {
      browserApi.storage.sync.set({ commandShortcut: shortcut }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCommandStatus("Could not save command bar shortcut (storage error).");
          return;
        }
        if (commandShortcutInput) {
          commandShortcutInput.value = formatShortcut(shortcut);
        }
        setCommandStatus("Command bar shortcut saved.");
      });
    } catch (e) {
      setCommandStatus("Could not save command bar shortcut.");
    }
  }

  function saveBlockedContentShortcut(shortcut) {
    try {
      browserApi.storage.sync.set({ blockedContentShortcut: shortcut }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setBlockedContentStatus("Could not save blocked content shortcut (storage error).");
          return;
        }
        if (blockedContentShortcutInput) {
          blockedContentShortcutInput.value = formatShortcut(shortcut);
        }
        setBlockedContentStatus("Blocked content shortcut saved.");
      });
    } catch (e) {
      setBlockedContentStatus("Could not save blocked content shortcut.");
    }
  }

  function createShortcutHandler(saveFn) {
    return (event) => {
      event.preventDefault();
      event.stopPropagation();

      const key = (event.key || "").toLowerCase();

      const ignoredKeys = [
        "shift",
        "control",
        "alt",
        "meta",
        "capslock",
        "tab"
      ];
      if (!key || ignoredKeys.includes(key)) {
        return;
      }

      const shortcut = {
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        key
      };

      saveFn(shortcut);
    };
  }

  function loadCustomShortcuts(callback) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          if (callback) callback();
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        renderCustomShortcuts(shortcuts);
        if (callback) callback();
      });
    } catch (e) {
      // Ignore errors
      if (callback) callback();
    }
  }

  function renderCustomShortcuts(shortcuts) {
    if (!customShortcutsList) return;

    const clearAllBtn = document.getElementById("clearAllCustomShortcuts");
    if (clearAllBtn) {
      clearAllBtn.style.display = shortcuts.length > 0 ? "block" : "none";
    }

    if (shortcuts.length === 0) {
      customShortcutsList.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "oz-help-sub";
      empty.textContent =
        'No custom shortcuts yet. Open the command bar and select "Add custom shortcut", or click "Add manually" above.';
      customShortcutsList.appendChild(empty);
      return;
    }

    customShortcutsList.replaceChildren();

    shortcuts.forEach((customShortcut, index) => {
      const card = document.createElement("div");
      card.style.marginBottom = "20px";
      // Extra right padding to avoid overlap with the top-right delete (×) button
      card.style.padding = "16px 56px 16px 16px";
      card.style.border = "1px solid rgba(148, 163, 184, 0.3)";
      card.style.borderRadius = "8px";
      card.style.backgroundColor = "rgba(249, 250, 251, 0.5)";
      card.className = "oz-custom-shortcut-card";
      card.setAttribute("data-shortcut-id", customShortcut.id);

      // Top-right delete button (removes the custom shortcut)
      const deleteXBtn = document.createElement("button");
      deleteXBtn.className = "oz-button oz-button-ghost oz-custom-shortcut-delete";
      deleteXBtn.type = "button";
      deleteXBtn.textContent = "×";
      deleteXBtn.title = "Delete shortcut";
      deleteXBtn.setAttribute("aria-label", "Delete custom shortcut");
      deleteXBtn.addEventListener("click", () => {
        deleteCustomShortcut(customShortcut.id);
      });
      card.appendChild(deleteXBtn);

      const nameRow = document.createElement("div");
      nameRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      nameRow.style.marginBottom = "12px";

      const nameLabel = document.createElement("label");
      nameLabel.className = "oz-label";
      nameLabel.textContent = "Name:";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "oz-shortcut-input";
      nameInput.placeholder = "Custom shortcut name";
      nameInput.value = customShortcut.description || customShortcut.name || "Custom shortcut";
      nameInput.setAttribute("data-shortcut-id", customShortcut.id);
      nameInput.setAttribute("data-field", "name");

      nameInput.addEventListener("change", () => {
        const newValue = nameInput.value.trim();
        // Save both name and description (they mirror each other)
        saveCustomShortcutField(customShortcut.id, "description", newValue);
      });

      nameRow.appendChild(nameLabel);
      nameRow.appendChild(nameInput);

      const selectorRow = document.createElement("div");
      selectorRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      selectorRow.style.marginBottom = "12px";

      const selectorLabel = document.createElement("label");
      selectorLabel.className = "oz-label";
      selectorLabel.textContent = "Selector:";

      const selectorInput = document.createElement("input");
      selectorInput.type = "text";
      selectorInput.className = "oz-shortcut-input";
      selectorInput.placeholder = "CSS selector (example: button[aria-label='Archive'])";
      selectorInput.value = customShortcut.selector || "";
      selectorInput.setAttribute("data-shortcut-id", customShortcut.id);
      selectorInput.setAttribute("data-field", "selector");

      selectorInput.addEventListener("change", () => {
        const trimmed = selectorInput.value.trim();
        saveCustomShortcutField(customShortcut.id, "selector", trimmed);
      });

      selectorRow.appendChild(selectorLabel);
      selectorRow.appendChild(selectorInput);

      const menuTriggerRow = document.createElement("div");
      menuTriggerRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      menuTriggerRow.style.marginBottom = "12px";

      const menuTriggerLabel = document.createElement("label");
      menuTriggerLabel.className = "oz-label";
      menuTriggerLabel.textContent = "Menu trigger:";

      const menuTriggerInput = document.createElement("input");
      menuTriggerInput.type = "text";
      menuTriggerInput.className = "oz-shortcut-input";
      menuTriggerInput.placeholder =
        "Filled when you pick the control (e.g. ribbon split-button chevron) — or type manually";
      menuTriggerInput.value = customShortcut.menuTriggerSelector || "";
      menuTriggerInput.setAttribute("data-shortcut-id", customShortcut.id);
      menuTriggerInput.setAttribute("data-field", "menuTriggerSelector");

      menuTriggerInput.addEventListener("change", () => {
        const v = menuTriggerInput.value.trim();
        saveCustomShortcutField(customShortcut.id, "menuTriggerSelector", v || null);
      });

      menuTriggerRow.appendChild(menuTriggerLabel);
      menuTriggerRow.appendChild(menuTriggerInput);

      const shortcutRow = document.createElement("div");
      shortcutRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      shortcutRow.style.marginBottom = "12px";

      const shortcutLabel = document.createElement("label");
      shortcutLabel.className = "oz-label";
      shortcutLabel.textContent = "Shortcut:";

      const shortcutInput = document.createElement("input");
      shortcutInput.type = "text";
      shortcutInput.className = "oz-shortcut-input";
      shortcutInput.placeholder = "Press keys…";
      shortcutInput.value = formatShortcut(customShortcut.shortcut);
      shortcutInput.setAttribute("data-shortcut-id", customShortcut.id);

      const clearHotkeyBtn = document.createElement("button");
      clearHotkeyBtn.className = "oz-button oz-button-ghost";
      clearHotkeyBtn.type = "button";
      clearHotkeyBtn.textContent = "Clear hotkey";
      clearHotkeyBtn.addEventListener("click", () => {
        saveCustomShortcut(customShortcut.id, null, { successMessage: "Hotkey cleared." });
        shortcutInput.value = formatShortcut(null);
      });

      shortcutRow.appendChild(shortcutLabel);
      shortcutRow.appendChild(shortcutInput);
      shortcutRow.appendChild(clearHotkeyBtn);

      card.appendChild(nameRow);
      card.appendChild(selectorRow);
      card.appendChild(menuTriggerRow);
      card.appendChild(shortcutRow);

      customShortcutsList.appendChild(card);

      // Add keyboard shortcut handler
      shortcutInput.addEventListener("keydown", createShortcutHandler((shortcut) => {
        saveCustomShortcut(customShortcut.id, shortcut);
        shortcutInput.value = formatShortcut(shortcut);
      }));
      shortcutInput.addEventListener("keyup", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  function saveCustomShortcut(id, shortcut, options = {}) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not save shortcut (storage error).");
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        const index = shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
          shortcuts[index] = { ...shortcuts[index], shortcut };
          browserApi.storage.sync.set({ customShortcuts: shortcuts }, () => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              setCustomStatus("Could not save shortcut (storage error).");
              return;
            }
            const successMessage =
              options && typeof options.successMessage === "string"
                ? options.successMessage
                : shortcut
                  ? "Shortcut saved."
                  : "Hotkey cleared.";
            setCustomStatus(successMessage);
          });
        }
      });
    } catch (e) {
      setCustomStatus("Could not save shortcut.");
    }
  }

  function saveCustomShortcutField(id, field, value) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not save (storage error).");
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        const index = shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
          // Description mirrors the name - when name changes, description updates
          shortcuts[index] = { ...shortcuts[index], [field]: value };
          browserApi.storage.sync.set({ customShortcuts: shortcuts }, () => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              setCustomStatus("Could not save (storage error).");
              return;
            }
            if (field === "selector") {
              setCustomStatus("Selector saved.");
            } else if (field === "menuTriggerSelector") {
              setCustomStatus("Menu trigger saved.");
            } else {
              setCustomStatus("Name saved.");
            }
          });
        }
      });
    } catch (e) {
      setCustomStatus("Could not save.");
    }
  }

  function clearAllCustomShortcuts() {
    if (!confirm("Are you sure you want to delete all custom shortcuts? This action cannot be undone.")) {
      return;
    }
    
    try {
      browserApi.storage.sync.set({ customShortcuts: [] }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not clear shortcuts (storage error).");
          return;
        }
        loadCustomShortcuts();
        setCustomStatus("All shortcuts cleared.");
      });
    } catch (e) {
      setCustomStatus("Could not clear shortcuts.");
    }
  }

  function deleteCustomShortcut(id) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not delete shortcut (storage error).");
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        const filtered = shortcuts.filter(s => s.id !== id);
        browserApi.storage.sync.set({ customShortcuts: filtered }, () => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            setCustomStatus("Could not delete shortcut (storage error).");
            return;
          }
          loadCustomShortcuts();
          setCustomStatus("Shortcut deleted.");
        });
      });
    } catch (e) {
      setCustomStatus("Could not delete shortcut.");
    }
  }

  function addManualCustomShortcut() {
    try {
      browserApi.storage.sync.get(
        {
          customShortcuts: [],
          [MANUAL_SHORTCUT_WARNING_KEY]: false
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            setCustomStatus("Could not add shortcut (storage error).");
            return;
          }

          const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
          const hasShownWarning = !!items[MANUAL_SHORTCUT_WARNING_KEY];

          if (!hasShownWarning) {
            alert(
              "Manual custom shortcuts are an advanced feature. Use valid CSS selectors and test carefully."
            );
          }

          const newShortcut = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            selector: "",
            description: "Manual shortcut",
            shortcut: null,
            menuTriggerSelector: null
          };

          const nextShortcuts = [...shortcuts, newShortcut];
          browserApi.storage.sync.set(
            {
              customShortcuts: nextShortcuts,
              [MANUAL_SHORTCUT_WARNING_KEY]: true
            },
            () => {
              if (browserApi.runtime && browserApi.runtime.lastError) {
                setCustomStatus("Could not add shortcut (storage error).");
                return;
              }
              loadCustomShortcuts(() => {
                const card = document.querySelector(
                  `.oz-custom-shortcut-card[data-shortcut-id="${newShortcut.id}"]`
                );
                if (card) {
                  card.scrollIntoView({ behavior: "smooth", block: "center" });
                  const nameInput = card.querySelector('input[data-field="name"]');
                  if (nameInput && typeof nameInput.focus === "function") {
                    nameInput.focus();
                    if (typeof nameInput.select === "function") {
                      nameInput.select();
                    }
                  }
                }
              });
              setCustomStatus("Manual shortcut created.");
            }
          );
        }
      );
    } catch (e) {
      setCustomStatus("Could not add shortcut.");
    }
  }

  function restoreOptions() {
    try {
      browserApi.storage.sync.get(
        {
          undoShortcut: DEFAULT_UNDO_SHORTCUT,
          commandShortcut: DEFAULT_COMMAND_SHORTCUT,
          blockedContentShortcut: DEFAULT_BLOCKED_CONTENT_SHORTCUT,
          vimEnabled: true,
          darkModeEnabled: true,
          inboxZeroEnabled: false,
          geminiApiKey: "",
          customShortcuts: [],
          aiTitleEditingEnabled: true
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            shortcutInput.value = formatShortcut(DEFAULT_UNDO_SHORTCUT);
            return;
          }
          const shortcut = (items && items.undoShortcut) || DEFAULT_UNDO_SHORTCUT;
          shortcutInput.value = formatShortcut(shortcut);

          if (commandShortcutInput) {
            const cmdShortcut =
              (items && items.commandShortcut) || DEFAULT_COMMAND_SHORTCUT;
            commandShortcutInput.value = formatShortcut(cmdShortcut);
          }

          if (blockedContentShortcutInput) {
            const blockedShortcut =
              (items && items.blockedContentShortcut) || DEFAULT_BLOCKED_CONTENT_SHORTCUT;
            blockedContentShortcutInput.value = formatShortcut(blockedShortcut);
          }

          if (vimToggle) {
            const enabled =
              items && typeof items.vimEnabled === "boolean"
                ? items.vimEnabled
                : true;
            vimToggle.checked = enabled;
          }

          const darkEnabled =
            items && typeof items.darkModeEnabled === "boolean"
              ? items.darkModeEnabled
              : true;
          if (darkToggle) {
            darkToggle.checked = darkEnabled;
          }
          applyTheme(darkEnabled);

          const inboxZeroEnabled =
            items && typeof items.inboxZeroEnabled === "boolean"
              ? items.inboxZeroEnabled
              : false;
          if (inboxZeroToggle) {
            inboxZeroToggle.checked = inboxZeroEnabled;
          }

          const geminiKey = (items && items.geminiApiKey) || "";
          if (geminiInput) {
            geminiInput.value = geminiKey;
          }

          const hasGeminiKey = !!String(geminiKey).trim();
          const storedAiTitleEditing =
            items && typeof items.aiTitleEditingEnabled === "boolean"
              ? items.aiTitleEditingEnabled
              : true;
          if (aiTitleEditingToggle) {
            aiTitleEditingToggle.disabled = !hasGeminiKey;
            aiTitleEditingToggle.checked = hasGeminiKey && storedAiTitleEditing;
            if (!hasGeminiKey && storedAiTitleEditing) {
              browserApi.storage.sync.set({ aiTitleEditingEnabled: false }, () => {});
            }
          }

          // Load custom shortcuts
          loadCustomShortcuts();
        }
      );
    } catch (e) {
      shortcutInput.value = formatShortcut(DEFAULT_UNDO_SHORTCUT);
    }
  }

  function clearShortcut() {
    const emptyShortcut = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: ""
    };
    saveShortcut(emptyShortcut);
  }

  function clearCommandShortcut() {
    const emptyShortcut = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: ""
    };
    saveCommandShortcut(emptyShortcut);
  }

  function clearBlockedContentShortcut() {
    const emptyShortcut = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: ""
    };
    saveBlockedContentShortcut(emptyShortcut);
  }

  function clearGeminiApiKey() {
    if (geminiInput) {
      geminiInput.value = "";
    }
    saveGeminiApiKey("");
  }

  if (shortcutInput) {
    shortcutInput.addEventListener("keydown", createShortcutHandler(saveShortcut));
    shortcutInput.addEventListener("keyup", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  if (commandShortcutInput) {
    commandShortcutInput.addEventListener(
      "keydown",
      createShortcutHandler(saveCommandShortcut)
    );
    commandShortcutInput.addEventListener("keyup", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearShortcut);
  }

  if (clearCommandBtn) {
    clearCommandBtn.addEventListener("click", clearCommandShortcut);
  }

  if (clearBlockedContentBtn) {
    clearBlockedContentBtn.addEventListener("click", clearBlockedContentShortcut);
  }

  if (blockedContentShortcutInput) {
    blockedContentShortcutInput.addEventListener(
      "keydown",
      createShortcutHandler(saveBlockedContentShortcut)
    );
    blockedContentShortcutInput.addEventListener("keyup", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  if (vimToggle) {
    vimToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      saveVimEnabled(!!target.checked);
    });
  }

  if (darkToggle) {
    darkToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      saveDarkModeEnabled(!!target.checked);
    });
  }

  if (inboxZeroToggle) {
    inboxZeroToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      saveInboxZeroEnabled(!!target.checked);
    });
  }

  if (aiTitleEditingToggle) {
    aiTitleEditingToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      if (target.disabled) {
        return;
      }
      saveAiTitleEditingEnabled(!!target.checked);
    });
  }

  if (saveGeminiBtn && geminiInput) {
    saveGeminiBtn.addEventListener("click", () => {
      saveGeminiApiKey(geminiInput.value.trim());
    });
  }

  if (clearGeminiBtn) {
    clearGeminiBtn.addEventListener("click", clearGeminiApiKey);
  }

  if (geminiInput) {
    geminiInput.addEventListener("input", () => {
      syncAiTitleEditingToggleGate();
    });
    geminiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        saveGeminiApiKey(geminiInput.value.trim());
      }
    });
  }

  function scrollToShortcut(shortcutId) {
    activatePanel("custom");
    loadCustomShortcuts(() => {
      setTimeout(() => {
        const card = document.querySelector(
          '.oz-custom-shortcut-card[data-shortcut-id="' + shortcutId + '"]'
        );
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.transition = "box-shadow 0.3s ease";
          card.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
          setTimeout(() => {
            card.style.boxShadow = "";
          }, 2000);
        }
        browserApi.storage.local.remove("scrollToShortcutId");
      }, 200);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Check if we need to scroll to a specific shortcut BEFORE loading options
    // This way we can wait for shortcuts to load before scrolling
    browserApi.storage.local.get({ scrollToShortcutId: null }, (items) => {
      const shortcutIdToScroll = items.scrollToShortcutId;
      
      // Load options (which will load shortcuts)
      restoreOptions();
      
      // If we need to scroll to a shortcut, do it after shortcuts are loaded
      if (shortcutIdToScroll) {
        scrollToShortcut(shortcutIdToScroll);
      }
    });
    
    // Add clear all button handler
    const clearAllBtn = document.getElementById("clearAllCustomShortcuts");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", clearAllCustomShortcuts);
    }

    if (manualAddCustomShortcutBtn) {
      manualAddCustomShortcutBtn.addEventListener("click", addManualCustomShortcut);
    }

    tabButtons.forEach((tab) => {
      tab.addEventListener("click", () => {
        const panelId = tab.getAttribute("data-panel");
        if (panelId) {
          activatePanel(panelId);
        }
      });
    });

    const exportSettingsBtn = document.getElementById("exportSettingsJson");
    if (exportSettingsBtn) {
      exportSettingsBtn.addEventListener("click", exportSettingsAndShortcuts);
    }

    wireImportSettingsUi();
  });

  // Listen for custom shortcuts changes (e.g., when added from content script)
  try {
    browserApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && changes.customShortcuts) {
        loadCustomShortcuts(() => {
          // After shortcuts are loaded, check if we need to scroll to a new one
          browserApi.storage.local.get({ scrollToShortcutId: null }, (items) => {
            if (items.scrollToShortcutId) {
              setTimeout(() => {
                scrollToShortcut(items.scrollToShortcutId);
              }, 200);
            }
          });
        });
      }
      
      // Also check for scrollToShortcutId in local storage (when a new shortcut is added)
      if (areaName === "local" && changes.scrollToShortcutId) {
        const newShortcutId = changes.scrollToShortcutId.newValue;
        if (newShortcutId) {
          // Load shortcuts first to ensure they're up to date, then scroll
          loadCustomShortcuts(() => {
            setTimeout(() => {
              scrollToShortcut(newShortcutId);
            }, 200);
          });
        }
      }
    });
  } catch (e) {
    // Ignore if storage events are not available
  }
})();



