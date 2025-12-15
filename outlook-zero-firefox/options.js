// Outlook Web Keyboard Shortcuts - Options Page

(() => {
  const browserApi = typeof chrome !== "undefined" ? chrome : browser;

  const DEFAULT_UNDO_SHORTCUT = {
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: "z"
  };

  const shortcutInput = document.getElementById("undoShortcut");
  const statusEl = document.getElementById("status");
  const clearBtn = document.getElementById("clearUndo");
  const vimToggle = document.getElementById("vimEnabled");

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

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.add("oz-status-visible");
    setTimeout(() => {
      statusEl.classList.remove("oz-status-visible");
    }, 2000);
  }

  function saveVimEnabled(enabled) {
    try {
      browserApi.storage.sync.set({ vimEnabled: enabled }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setStatus("Could not update vim setting (storage error).");
          return;
        }
        setStatus(enabled ? "Vim navigation enabled." : "Vim navigation disabled.");
      });
    } catch (e) {
      setStatus("Could not update vim setting.");
    }
  }

  function saveShortcut(shortcut) {
    try {
      browserApi.storage.sync.set({ undoShortcut: shortcut }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setStatus("Could not save shortcut (storage error).");
          return;
        }
        shortcutInput.value = formatShortcut(shortcut);
        setStatus("Shortcut saved.");
      });
    } catch (e) {
      setStatus("Could not save shortcut.");
    }
  }

  function handleKeyCapture(event) {
    event.preventDefault();
    event.stopPropagation();

    const key = (event.key || "").toLowerCase();

    // Ignore keys that are just modifiers or not useful
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

    saveShortcut(shortcut);
  }

  function restoreOptions() {
    try {
      browserApi.storage.sync.get(
        { undoShortcut: DEFAULT_UNDO_SHORTCUT, vimEnabled: true },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            shortcutInput.value = formatShortcut(DEFAULT_UNDO_SHORTCUT);
            return;
          }
          const shortcut = (items && items.undoShortcut) || DEFAULT_UNDO_SHORTCUT;
          shortcutInput.value = formatShortcut(shortcut);

          if (vimToggle) {
            const enabled =
              items && typeof items.vimEnabled === "boolean"
                ? items.vimEnabled
                : true;
            vimToggle.checked = enabled;
          }
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

  if (shortcutInput) {
    shortcutInput.addEventListener("keydown", handleKeyCapture);
    shortcutInput.addEventListener("keyup", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearShortcut);
  }

  if (vimToggle) {
    vimToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      saveVimEnabled(!!target.checked);
    });
  }

  document.addEventListener("DOMContentLoaded", restoreOptions);
})();

