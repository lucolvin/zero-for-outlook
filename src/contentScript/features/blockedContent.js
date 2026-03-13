// Feature: click Outlook's "Show blocked content" button in the current message.

export function findShowBlockedContentButton() {
  const targetText = "show blocked content";

  // Look for explicit buttons first
  const buttonSelectors = ["button[role='button']", "button"];
  for (const selector of buttonSelectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    for (const el of elements) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text === targetText) {
        return el;
      }
    }
  }

  return null;
}

export function triggerShowBlockedContent() {
  const button = findShowBlockedContentButton();
  if (!button) {
    return;
  }

  /** @type {HTMLElement} */ (button).click();
}

