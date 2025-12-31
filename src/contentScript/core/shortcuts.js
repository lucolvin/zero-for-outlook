// Shortcut matching and formatting utilities
export function shortcutMatches(event, shortcut) {
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

export function formatShortcutDisplay(shortcut) {
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

export function isEditableElement(target) {
  if (!target) return false;
  const tag = target.tagName ? target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

