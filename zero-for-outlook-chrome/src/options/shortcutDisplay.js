export function formatShortcut(shortcut) {
  if (!shortcut || !shortcut.key) return "Not set";

  const parts = [];
  if (shortcut.ctrlKey) parts.push("Ctrl");
  if (shortcut.altKey) parts.push("Alt");
  if (shortcut.shiftKey) parts.push("Shift");
  if (shortcut.metaKey) parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Meta");
  parts.push(shortcut.key.toUpperCase());

  return parts.join(" + ");
}


