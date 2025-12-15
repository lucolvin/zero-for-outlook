// Outlook Web Keyboard Shortcuts - Content Script
// Listens for a configurable keyboard shortcut and clicks the "Undo" button

(() => {
  const browserApi = typeof chrome !== "undefined" ? chrome : browser;

  const DEFAULT_UNDO_SHORTCUT = {
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: "z" // normalized to lower-case
  };

  let undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };

  function loadSettings() {
    try {
      browserApi.storage.sync.get(
        { undoShortcut: DEFAULT_UNDO_SHORTCUT },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            // Fail silently; use defaults
            return;
          }
          if (items && items.undoShortcut) {
            undoShortcut = {
              ...DEFAULT_UNDO_SHORTCUT,
              ...items.undoShortcut
            };
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

  function findUndoButton() {
    // Outlook Web typically uses an "Undo" button with an aria-label or title of "Undo"
    const selectors = [
      'button[aria-label="Undo"]',
      'button[title="Undo"]',
      'button[aria-label*="Undo"]',
      'button[title*="Undo"]'
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) return btn;
    }

    // Fallback: search by text content (less efficient but more robust)
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      return text === "undo";
    });
  }

  function triggerUndo() {
    const button = findUndoButton();
    if (!button) {
      return;
    }
    button.click();
  }

  function onKeyDown(event) {
    try {
      // Ignore if user is typing in an input/textarea/contentEditable
      if (isEditableElement(event.target)) {
        return;
      }

      if (!undoShortcut) return;

      if (shortcutMatches(event, undoShortcut)) {
        event.preventDefault();
        event.stopPropagation();
        triggerUndo();
      }
    } catch (e) {
      // Never let errors break the page
      // eslint-disable-next-line no-console
      console.debug("Outlook Keyboard Shortcuts content script error:", e);
    }
  }

  // Initial load
  loadSettings();

  // Listen for settings changes from the options page
  try {
    browserApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") return;
      if (changes.undoShortcut && changes.undoShortcut.newValue) {
        undoShortcut = {
          ...DEFAULT_UNDO_SHORTCUT,
          ...changes.undoShortcut.newValue
        };
      }
    });
  } catch (e) {
    // Ignore if storage events are not available
  }

  window.addEventListener("keydown", onKeyDown, true);
})();



