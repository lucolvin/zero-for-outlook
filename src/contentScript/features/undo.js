// Undo shortcut feature: find and trigger Outlook's Undo button,
// and refocus the restored message in the list.

import {
  getMessageRows,
  buildRowKeySet,
  refocusRestoredMessage
} from "../core/messageList.js";

export function findUndoButton() {
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

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    return text === "undo";
  });
}

export function triggerUndo() {
  const button = findUndoButton();
  if (!button) {
    return;
  }

  const beforeRows = getMessageRows();
  const beforeKeys = buildRowKeySet(beforeRows);
  const beforeCount = beforeRows.length;

  /** @type {HTMLElement} */ (button).click();
  refocusRestoredMessage(beforeKeys, beforeCount);
}


