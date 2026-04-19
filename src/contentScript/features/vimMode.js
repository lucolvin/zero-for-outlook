// Vim-style navigation helpers and context management.

import {
  getMessageRows,
  getCurrentRowIndex,
  focusMessageRow,
  getMessageListContainer
} from "../core/messageList.js";

/**
 * @param {"down" | "up"} direction
 * @param {boolean} shiftKey
 */
function createArrowKeyEvent(direction, shiftKey) {
  const key = direction === "down" ? "ArrowDown" : "ArrowUp";
  const keyCode = direction === "down" ? 40 : 38;
  return new KeyboardEvent("keydown", {
    key,
    code: key,
    keyCode,
    which: keyCode,
    shiftKey,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    bubbles: true,
    cancelable: true
  });
}

let vimContext = "auto"; // "auto" | "sidebar"

export function resetVimContext() {
  vimContext = "auto";
}

export function getVimContext() {
  return vimContext;
}

export function sendShiftArrow(direction) {
  /** @type {Element | null} */
  const targetEl = document.activeElement || document.body;
  if (!targetEl) return;

  targetEl.dispatchEvent(createArrowKeyEvent(direction, true));
}

/**
 * Move the message list selection like ArrowDown/ArrowUp.
 * Outlook virtualizes rows: only a window of rows exists in the DOM, so stepping by
 * row index would stop after ~N items. Dispatching arrow keys matches native behavior
 * and keeps scrolling (notably on Firefox, which often keeps a smaller DOM window).
 */
export function moveSelection(direction) {
  const container = getMessageListContainer();
  if (!container) return;

  const focusInList =
    document.activeElement && container.contains(document.activeElement);

  if (!focusInList) {
    const rows = getMessageRows();
    if (!rows.length) return;

    let index = getCurrentRowIndex(rows);
    if (index === -1) {
      index = direction === "down" ? 0 : rows.length - 1;
      focusMessageRow(rows[index]);
      return;
    }

    // Selection is known but focus is in the reading pane (etc.): anchor focus on the row, then step once.
    focusMessageRow(rows[index]);
    const targetEl = document.activeElement || document.body;
    targetEl.dispatchEvent(createArrowKeyEvent(direction, false));
    return;
  }

  const targetEl = document.activeElement || document.body;
  targetEl.dispatchEvent(createArrowKeyEvent(direction, false));
}

export function getNavItems() {
  const selectors = [
    'nav [role="treeitem"]',
    'nav [role="menuitem"]',
    '[role="tree"] [role="treeitem"]',
    '[role="menubar"] [role="menuitem"]',
    '[data-is-selected]',
    ".is-selected",
    ".selected"
  ];

  const cutoff = window.innerWidth * 0.3;
  let items = [];

  for (const selector of selectors) {
    const found = Array.from(document.querySelectorAll(selector));
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
    const maybeItems = Array.from(
      document.querySelectorAll('[role="treeitem"], [role="menuitem"], [role="tab"]')
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

export function getCurrentNavIndex(items) {
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

export function moveHorizontal(direction) {
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

export function moveNavVertical(direction) {
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

export function focusSidebar() {
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
  vimContext = "sidebar";
}

export function focusMessageListFromSidebar() {
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

  vimContext = "auto";
}


