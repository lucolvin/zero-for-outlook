// Shortcut matching and formatting utilities

// Detect macOS using the modern userAgentData API when available, falling
// back to navigator.platform (which is deprecated but still widely supported).
// On non-Mac platforms we treat a stored "metaKey" requirement as the
// "primary modifier" and accept ctrlKey instead, so defaults that were
// authored for Cmd on macOS still work as Ctrl on Windows and Linux.
export function isMacPlatform() {
  try {
    const uaPlatform =
      typeof navigator !== "undefined" &&
      navigator.userAgentData &&
      navigator.userAgentData.platform;
    if (uaPlatform) return /mac/i.test(uaPlatform);
    const legacy = (typeof navigator !== "undefined" && navigator.platform) || "";
    return /Mac|iPad|iPhone|iPod/i.test(legacy);
  } catch (e) {
    return false;
  }
}

export function shortcutMatches(event, shortcut) {
  const key = (event.key || "").toLowerCase();
  if (!shortcut || !key) return false;
  if (key !== (shortcut.key || "").toLowerCase()) return false;
  if (!!event.shiftKey !== !!shortcut.shiftKey) return false;
  if (!!event.altKey !== !!shortcut.altKey) return false;

  if (isMacPlatform()) {
    // Strict matching on macOS keeps Cmd and Ctrl distinct.
    return (
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }

  // On non-Mac platforms, treat metaKey in the stored shortcut as a request
  // for the "primary modifier" and accept ctrlKey too. The Windows key is
  // captured by the OS in most browsers, so requiring real metaKey would
  // make Cmd-based defaults unreachable.
  const requirePrimary = !!shortcut.metaKey || !!shortcut.ctrlKey;
  const havePrimary = !!event.metaKey || !!event.ctrlKey;
  return requirePrimary === havePrimary;
}

export function formatShortcutDisplay(shortcut) {
  if (!shortcut || !shortcut.key) return "Not set";

  const mac = isMacPlatform();
  const parts = [];
  if (shortcut.ctrlKey) parts.push("Ctrl");
  if (shortcut.altKey) parts.push("Alt");
  if (shortcut.shiftKey) parts.push("Shift");
  if (shortcut.metaKey) {
    parts.push(mac ? "Cmd" : "Ctrl");
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
