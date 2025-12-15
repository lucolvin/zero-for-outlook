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
  let vimEnabled = true;

  function loadSettings() {
    try {
      browserApi.storage.sync.get(
        { undoShortcut: DEFAULT_UNDO_SHORTCUT, vimEnabled: true },
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
            if (typeof items.vimEnabled === "boolean") {
              vimEnabled = items.vimEnabled;
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

  function getMessageRows() {
    // Outlook's message list is typically rendered as a grid or listbox of rows/options
    const container =
      document.querySelector('[role="grid"]') ||
      document.querySelector('[role="listbox"]') ||
      document.querySelector('[role="treegrid"]');
    if (!container) return [];
    return Array.from(
      container.querySelectorAll('[role="row"], [role="option"]')
    );
  }

  function getCurrentRowIndex(rows) {
    if (!rows || !rows.length) return -1;
    const active = document.activeElement;
    let fallbackIndex = -1;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row) continue;
      const el = /** @type {HTMLElement} */ (row);

      // Selected via ARIA
      if (el.getAttribute("aria-selected") === "true") {
        return i;
      }

      // Selected via data attribute (common in React grids)
      if (el.getAttribute("data-is-selected") === "true") {
        fallbackIndex = i;
      }

      // Selected via CSS class
      if (el.classList && (el.classList.contains("is-selected") || el.classList.contains("selected"))) {
        fallbackIndex = i;
      }

      // Focused element is inside this row
      if (active && el.contains(active)) {
        fallbackIndex = i;
      }
    }

    return fallbackIndex;
  }

  function moveSelection(direction) {
    const rows = getMessageRows();
    if (!rows.length) return;

    let index = getCurrentRowIndex(rows);
    if (index === -1) {
      index = direction === "down" ? 0 : rows.length - 1;
    } else if (direction === "down") {
      index = Math.min(rows.length - 1, index + 1);
    } else {
      index = Math.max(0, index - 1);
    }

    const targetRow = /** @type {HTMLElement} */ (rows[index]);
    if (!targetRow) return;

    // Click to let Outlook update selection and preview, and focus for keyboard consistency
    targetRow.click();
    if (typeof targetRow.focus === "function") {
      targetRow.focus();
    }
    if (typeof targetRow.scrollIntoView === "function") {
      targetRow.scrollIntoView({ block: "nearest" });
    }
  }

  function onKeyDown(event) {
    try {
      // Ignore if user is typing in an input/textarea/contentEditable
      if (isEditableElement(event.target)) {
        return;
      }

      const key = (event.key || "").toLowerCase();

      // Vim-style navigation: j = down, k = up (no modifiers)
      if (
        vimEnabled &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        if (key === "j") {
          event.preventDefault();
          event.stopPropagation();
          moveSelection("down");
          return;
        }
        if (key === "k") {
          event.preventDefault();
          event.stopPropagation();
          moveSelection("up");
          return;
        }
      }

      if (undoShortcut && shortcutMatches(event, undoShortcut)) {
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
      if (changes.vimEnabled && typeof changes.vimEnabled.newValue === "boolean") {
        vimEnabled = changes.vimEnabled.newValue;
      }
    });
  } catch (e) {
    // Ignore if storage events are not available
  }

  window.addEventListener("keydown", onKeyDown, true);
})();

