// Outlook Web Keyboard Shortcuts - Content Script (Firefox)
// Entry module currently contains the legacy implementation; future refactors
// will split this into smaller feature modules imported from this file.
//
// For behavioral parity during the initial refactor, this file mirrors the
// existing contentScript.js logic.

(() => {
  const browserApi = typeof chrome !== "undefined" ? chrome : browser;

  const DEFAULT_UNDO_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: "z" // normalized to lower-case
  };
  const DEFAULT_COMMAND_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: true,
    key: "k"
  };

  let undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
  let commandShortcut = { ...DEFAULT_COMMAND_SHORTCUT };
  let vimEnabled = true;
  let darkModeEnabled = true;
  /** @type {"auto" | "sidebar"} */
  let vimContext = "auto";

  function loadSettings() {
    try {
      browserApi.storage.sync.get(
        {
          undoShortcut: DEFAULT_UNDO_SHORTCUT,
          commandShortcut: DEFAULT_COMMAND_SHORTCUT,
          vimEnabled: true,
          darkModeEnabled: true
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            // Fail silently; use defaults
            return;
          }
          if (items) {
            if (items.undoShortcut) {
              undoShortcut = {
                ...DEFAULT_UNDO_SHORTCUT,
                ...items.undoShortcut
              };
            }
            if (items.commandShortcut) {
              commandShortcut = {
                ...DEFAULT_COMMAND_SHORTCUT,
                ...items.commandShortcut
              };
            }
            if (typeof items.vimEnabled === "boolean") {
              vimEnabled = items.vimEnabled;
            }
            if (typeof items.darkModeEnabled === "boolean") {
              darkModeEnabled = items.darkModeEnabled;
            }
          }
        }
      );
    } catch (e) {
      // Fallback to defaults if storage is not available
      undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
    }
  }

  function isEditableElement(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function shortcutMatches(event, shortcut) {
    const key = (event.key || "").toLowerCase();
    return (
      !!shortcut &&
      !!key &&
      key === (shortcut.key || "").toLowerCase() &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }

  function formatShortcutDisplay(shortcut) {
    if (!shortcut || !shortcut.key) return "Not set";

    const parts = [];
    if (shortcut.ctrlKey) parts.push("Ctrl");
    if (shortcut.altKey) parts.push("Alt");
    if (shortcut.shiftKey) parts.push("Shift");
    if (shortcut.metaKey) {
      parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Meta");
    }
    parts.push((shortcut.key || "").toUpperCase());

    return parts.join(" + ");
  }

  // ... (rest of the existing contentScript.js implementation remains unchanged)
})();