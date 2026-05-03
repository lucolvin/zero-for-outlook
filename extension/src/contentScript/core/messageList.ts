// Core helpers for working with Outlook's message list

export function getMessageListContainer() {
  return (
    document.querySelector('[role="grid"]') ||
    document.querySelector('[role="listbox"]') ||
    document.querySelector('[role="treegrid"]')
  );
}

export function getMessageRows() {
  const container = getMessageListContainer();
  if (!container) return [];
  return Array.from(container.querySelectorAll('[role="row"], [role="option"]'));
}

export function getInboxMessageCount() {
  const rows = getMessageRows();
  if (!rows.length) return 0;

  let count = 0;
  for (const row of rows) {
    const el = /** @type {HTMLElement} */ (row);
    if (!el) continue;

    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
    const text = (el.textContent || "").trim().toLowerCase();

    const isEmptyPlaceholder =
      ariaLabel.includes("no items") ||
      ariaLabel.includes("no conversations") ||
      ariaLabel.includes("no messages") ||
      ariaLabel.includes("you're all caught up") ||
      text.includes("no items") ||
      text.includes("no conversations") ||
      text.includes("no messages") ||
      text.includes("you're all caught up");

    if (!isEmptyPlaceholder) {
      count += 1;
    }
  }

  return count;
}

export function getCurrentRowIndex(rows) {
  if (!rows || !rows.length) return -1;
  const active = document.activeElement;
  let fallbackIndex = -1;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    const el = /** @type {HTMLElement} */ (row);

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

export function hasSelectedMessage() {
  const rows = getMessageRows();
  if (!rows.length) return false;
  return getCurrentRowIndex(rows) !== -1;
}

export function focusMessageRow(row) {
  const targetRow = /** @type {HTMLElement} */ (row);
  if (!targetRow) return;
  targetRow.click();
  if (typeof targetRow.focus === "function") {
    targetRow.focus();
  }
  if (typeof targetRow.scrollIntoView === "function") {
    targetRow.scrollIntoView({ block: "nearest" });
  }
}

export function getRowKey(row) {
  const el = /** @type {HTMLElement} */ (row);
  if (!el) return "";

  const attrCandidates = [
    "data-conversation-id",
    "data-conversationid",
    "data-thread-id",
    "data-threadid",
    "data-message-id",
    "data-messageid",
    "data-itemid",
    "data-item-id"
  ];

  for (const attr of attrCandidates) {
    const value = el.getAttribute(attr);
    if (value) {
      return `${attr}:${value}`;
    }
  }

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) {
    return `aria:${ariaLabel}`;
  }

  const text = (el.textContent || "").trim();
  if (text) {
    return `text:${text.slice(0, 200)}`;
  }

  return "";
}

export function buildRowKeySet(rows) {
  const result = new Set();
  for (const row of rows) {
    const key = getRowKey(row);
    if (key) {
      result.add(key);
    }
  }
  return result;
}

export function refocusRestoredMessage(previousKeys, previousCount) {
  const container = getMessageListContainer() || document.body;
  if (!container) return;

  const prevCount = typeof previousCount === "number" ? previousCount : 0;

  const findRestoredRow = () => {
    const rows = getMessageRows();
    for (const row of rows) {
      const key = getRowKey(row);
      if (key && !previousKeys.has(key)) {
        return /** @type {HTMLElement} */ (row);
      }
    }

    if (rows.length > prevCount && rows[0]) {
      return /** @type {HTMLElement} */ (rows[0]);
    }

    return null;
  };

  const focusIfRestored = () => {
    const restored = findRestoredRow();
    if (restored) {
      focusMessageRow(restored);
      return true;
    }
    return false;
  };

  if (focusIfRestored()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (focusIfRestored()) {
      observer.disconnect();
      clearTimeout(timeoutId);
    }
  });

  observer.observe(container, { childList: true, subtree: true });
  const timeoutId = setTimeout(() => observer.disconnect(), 3000);
}


