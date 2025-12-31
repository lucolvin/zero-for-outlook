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

  const shortcutInput = document.getElementById("undoShortcut");
  const commandShortcutInput = document.getElementById("commandShortcut");
  const undoStatusEl = document.getElementById("status");
  const commandStatusEl = document.getElementById("status-command");
  const vimStatusEl = document.getElementById("status-vim");
  const darkStatusEl = document.getElementById("status-dark");
  const inboxZeroStatusEl = document.getElementById("status-inbox-zero");
  const geminiStatusEl = document.getElementById("status-gemini");
  const clearBtn = document.getElementById("clearUndo");
  const clearCommandBtn = document.getElementById("clearCommand");
  const vimToggle = document.getElementById("vimEnabled");
  const darkToggle = document.getElementById("darkModeEnabled");
  const inboxZeroToggle = document.getElementById("inboxZeroEnabled");
  const geminiInput = document.getElementById("geminiApiKey");
  const saveGeminiBtn = document.getElementById("saveGeminiKey");
  const clearGeminiBtn = document.getElementById("clearGeminiKey");
  const customShortcutsList = document.getElementById("customShortcutsList");
  const customStatusEl = document.getElementById("status-custom");
  const customShortcutsSection = document.getElementById("custom-shortcuts-section");
  const customShortcutsPage = document.getElementById("custom-shortcuts-page");
  const manageCustomShortcutsBtn = document.getElementById("manageCustomShortcuts");
  const backToMainBtn = document.getElementById("backToMain");
  const aiTitleEditingToggle = document.getElementById("aiTitleEditingEnabled");
  const aiTitleEditingStatusEl = document.getElementById("status-ai-title-editing");

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

  function saveGeminiApiKey(value) {
    try {
      browserApi.storage.sync.set({ geminiApiKey: value || "" }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setGeminiStatus("Could not save Gemini API key (storage error).");
          return;
        }
        setGeminiStatus(value ? "Gemini API key saved." : "Gemini API key cleared.");
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
      customShortcutsList.innerHTML = '<p class="oz-help-sub">No custom shortcuts yet. Open the command bar and select "Add custom shortcut" to get started.</p>';
      return;
    }

    customShortcutsList.innerHTML = "";

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

      const selectorDisplay = document.createElement("code");
      selectorDisplay.className = "oz-selector-display";
      selectorDisplay.textContent = customShortcut.selector || "";

      selectorRow.appendChild(selectorLabel);
      selectorRow.appendChild(selectorDisplay);

      const shortcutRow = document.createElement("div");
      shortcutRow.className = "oz-shortcut-row oz-custom-shortcut-row";

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
            setCustomStatus("Name saved.");
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

  function restoreOptions() {
    try {
      browserApi.storage.sync.get(
        {
          undoShortcut: DEFAULT_UNDO_SHORTCUT,
          commandShortcut: DEFAULT_COMMAND_SHORTCUT,
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

          if (geminiInput) {
            geminiInput.value = (items && items.geminiApiKey) || "";
          }

          const aiTitleEditingEnabled =
            items && typeof items.aiTitleEditingEnabled === "boolean"
              ? items.aiTitleEditingEnabled
              : true;
          if (aiTitleEditingToggle) {
            aiTitleEditingToggle.checked = aiTitleEditingEnabled;
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
    geminiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        saveGeminiApiKey(geminiInput.value.trim());
      }
    });
  }

  function showCustomShortcutsPage() {
    if (customShortcutsSection) {
      customShortcutsSection.style.display = "none";
    }
    if (customShortcutsPage) {
      customShortcutsPage.style.display = "block";
      // Load shortcuts when showing the page
      loadCustomShortcuts();
    }
  }

  function hideCustomShortcutsPage() {
    if (customShortcutsPage) {
      customShortcutsPage.style.display = "none";
    }
    if (customShortcutsSection) {
      customShortcutsSection.style.display = "block";
    }
  }

  function scrollToShortcut(shortcutId) {
    // First ensure shortcuts are loaded, then scroll
    loadCustomShortcuts(() => {
      // Wait a bit for DOM to update
      setTimeout(() => {
        // Show the custom shortcuts page first
        showCustomShortcutsPage();
        
        // Wait a bit more for the page to be shown, then find and scroll to the card
        setTimeout(() => {
          // Find the card with the matching shortcut ID (using data-shortcut-id attribute on the card)
          const card = document.querySelector('.oz-custom-shortcut-card[data-shortcut-id="' + shortcutId + '"]');
          if (card) {
            // Scroll to the card
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            // Highlight the card briefly
            card.style.transition = "box-shadow 0.3s ease";
            card.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
            setTimeout(() => {
              card.style.boxShadow = "";
            }, 2000);
          }
          // Clear the stored shortcut ID
          browserApi.storage.local.remove("scrollToShortcutId");
        }, 200);
      }, 100);
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

    // Add navigation handlers
    if (manageCustomShortcutsBtn) {
      manageCustomShortcutsBtn.addEventListener("click", showCustomShortcutsPage);
    }

    if (backToMainBtn) {
      backToMainBtn.addEventListener("click", hideCustomShortcutsPage);
    }
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



