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
  /** @type {"auto" | "sidebar"} */
  let vimContext = "auto";

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

  function getNavItems() {
    // Try to find primary navigation elements (folders / sidebars) in the *left* rail.
    // We explicitly prefer folder / tree navigation over the top app bar tabs.
    const selectors = [
      // Folder tree / left navigation items
      'nav [role="treeitem"]',
      'nav [role="menuitem"]',
      '[role="tree"] [role="treeitem"]',
      '[role="menubar"] [role="menuitem"]',
      // Common Outlook-specific data attributes/classes (best effort)
      '[data-is-selected]',
      '.is-selected',
      '.selected'
    ];

    const cutoff = window.innerWidth * 0.3;
    let items = [];

    for (const selector of selectors) {
      const found = Array.from(document.querySelectorAll(selector));
      // Restrict to elements that are visually in the left ~30% of the viewport,
      // so we don't accidentally grab the top horizontal app bar.
      items = found.filter((el) => {
        try {
          const rect = el.getBoundingClientRect();
          return rect.left >= 0 && rect.left < cutoff;
        } catch {
          return false;
        }
      });
      if (items.length) break;
    }

    if (!items.length) {
      // Fallback: anything that looks like a nav item in the left 30% of the viewport
      const maybeItems = Array.from(
        document.querySelectorAll(
          // Prefer tree / menu / tab items but still keep them in the left region
          '[role="treeitem"], [role="menuitem"], [role="tab"]'
        )
      );
      items = maybeItems.filter((el) => {
        try {
          const rect = el.getBoundingClientRect();
          return rect.left >= 0 && rect.left < cutoff;
        } catch {
          return false;
        }
      });
    }

    return items;
  }

  function getCurrentNavIndex(items) {
    if (!items || !items.length) return -1;
    const active = document.activeElement;
    let fallbackIndex = -1;

    for (let i = 0; i < items.length; i += 1) {
      const el = /** @type {HTMLElement} */ (items[i]);
      if (!el) continue;

      if (el.getAttribute("aria-selected") === "true") {
        return i;
      }
      if (el.getAttribute("data-is-selected") === "true") {
        fallbackIndex = i;
      }
      if (el.classList && (el.classList.contains("is-selected") || el.classList.contains("selected"))) {
        fallbackIndex = i;
      }
      if (active && el.contains(active)) {
        fallbackIndex = i;
      }
    }

    return fallbackIndex;
  }

  function moveHorizontal(direction) {
    const items = getNavItems();
    if (!items.length) return;

    let index = getCurrentNavIndex(items);
    if (index === -1) {
      index = direction === "right" ? 0 : items.length - 1;
    } else if (direction === "right") {
      index = Math.min(items.length - 1, index + 1);
    } else {
      index = Math.max(0, index - 1);
    }

    const target = /** @type {HTMLElement} */ (items[index]);
    if (!target) return;

    target.click();
    if (typeof target.focus === "function") {
      target.focus();
    }
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest" });
    }
  }

  function moveNavVertical(direction) {
    const items = getNavItems();
    if (!items.length) return;

    let index = getCurrentNavIndex(items);
    if (index === -1) {
      index = direction === "down" ? 0 : items.length - 1;
    } else if (direction === "down") {
      index = Math.min(items.length - 1, index + 1);
    } else {
      index = Math.max(0, index - 1);
    }

    const target = /** @type {HTMLElement} */ (items[index]);
    if (!target) return;

    target.click();
    if (typeof target.focus === "function") {
      target.focus();
    }
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest" });
    }
  }

  function focusSidebar() {
    const items = getNavItems();
    if (!items.length) return;

    let index = getCurrentNavIndex(items);
    if (index === -1) {
      index = 0;
    }

    const target = /** @type {HTMLElement} */ (items[index]);
    if (!target) return;

    target.click();
    if (typeof target.focus === "function") {
      target.focus();
    }
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest" });
    }
    // Keep j / k bound to the sidebar even if Outlook tries to steal focus.
    vimContext = "sidebar";
  }

  function focusMessageListFromSidebar() {
    const rows = getMessageRows();
    if (!rows.length) {
      vimContext = "auto";
      return;
    }

    let index = getCurrentRowIndex(rows);
    if (index === -1) {
      index = 0;
    }

    const targetRow = /** @type {HTMLElement} */ (rows[index]);
    if (!targetRow) {
      vimContext = "auto";
      return;
    }

    targetRow.click();
    if (typeof targetRow.focus === "function") {
      targetRow.focus();
    }
    if (typeof targetRow.scrollIntoView === "function") {
      targetRow.scrollIntoView({ block: "nearest" });
    }

    // Back to default behavior: j / k control the message list.
    vimContext = "auto";
  }

  function onKeyDown(event) {
    try {
      // Ignore if user is typing in an input/textarea/contentEditable
      if (isEditableElement(event.target)) {
        // When typing, fall back to default context.
        vimContext = "auto";
        return;
      }

      const key = (event.key || "").toLowerCase();

      // Vim-style navigation (no modifiers):
      // - j / k: move vertically within current context
      //   * message list in default "auto" context
      //   * sidebar while vimContext === "sidebar" (even if Outlook steals DOM focus)
      // - h: focus / pin the sidebar (vimContext = "sidebar")
      // - l: if in sidebar context, move into the message list and reset context
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
          if (vimContext === "sidebar") {
            moveNavVertical("down");
          } else {
            moveSelection("down");
          }
          return;
        }
        if (key === "k") {
          event.preventDefault();
          event.stopPropagation();
          if (vimContext === "sidebar") {
            moveNavVertical("up");
          } else {
            moveSelection("up");
          }
          return;
        }
        if (key === "h") {
          event.preventDefault();
          event.stopPropagation();
          focusSidebar();
          return;
        }
        if (key === "l") {
          event.preventDefault();
          event.stopPropagation();
          if (vimContext === "sidebar") {
            focusMessageListFromSidebar();
          } else {
            focusSidebar();
          }
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

