// @ts-nocheck
// Best-effort helpers to trigger Outlook UI (Block, Signatures, etc.).
// Markup varies by tenant and layout; these prefer the reading pane and open overflow menus when needed.

const ISSUES_URL = "https://github.com/lucolvin/zero-for-outlook/issues/new/choose";

function getReadingPaneRoot() {
  return (
    document.getElementById("ConversationReadingPaneContainer") ||
    document.querySelector('[data-app-section="ConversationContainer"]') ||
    null
  );
}

function normalizeControlText(el) {
  if (!el) return "";
  const t = (el.textContent || "").trim().toLowerCase();
  const a = (el.getAttribute("aria-label") || "").trim().toLowerCase();
  const ti = (el.getAttribute("title") || "").trim().toLowerCase();
  const n = (el.getAttribute("name") || "").trim().toLowerCase();
  return `${t} ${a} ${ti} ${n}`.replace(/\s+/g, " ").trim();
}

function collectClickable(root) {
  if (!root || !root.querySelectorAll) return [];
  return Array.from(
    root.querySelectorAll('button, [role="button"], [role="menuitem"], [role="menuitemradio"], a[href]')
  );
}

function clickFirstMatch(root, testFn) {
  for (const el of collectClickable(root)) {
    const c = normalizeControlText(el);
    if (!c) continue;
    if (testFn(c)) {
      /** @type {HTMLElement} */ (el).click();
      return true;
    }
  }
  return false;
}

function tryClickOverflowInRoot(root) {
  if (!root) return false;
  for (const el of collectClickable(root)) {
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const title = (el.getAttribute("title") || "").toLowerCase();
    if (
      aria.includes("more actions") ||
      aria.includes("more options") ||
      aria.includes("overflow") ||
      title.includes("more actions") ||
      (aria === "more" && el.closest('[data-app-section="ConversationContainer"], #ConversationReadingPaneContainer'))
    ) {
      /** @type {HTMLElement} */ (el).click();
      return true;
    }
  }
  return false;
}

function clickFirstMatchInOpenMenus(testFn) {
  const menus = document.querySelectorAll(
    '[role="menu"]:not([hidden]), [role="listbox"]:not([hidden]), [data-popper-placement]'
  );
  for (const menu of menus) {
    if (clickFirstMatch(menu, testFn)) {
      return true;
    }
  }
  return clickFirstMatch(document.body, testFn);
}

/**
 * Opens reading-pane overflow (if needed) and clicks "Block" / "Block sender" style entries.
 */
export function tryBlockSender() {
  const pane = getReadingPaneRoot();
  const roots = pane ? [pane, document.body] : [document.body];
  for (const root of roots) {
    if (
      clickFirstMatch(root, (c) => {
        if (!c.includes("block")) return false;
        if (c.includes("unblock")) return false;
        return c.includes("sender") || c.includes("block sender") || c === "block" || c.startsWith("block ");
      })
    ) {
      return true;
    }
  }
  if (pane && tryClickOverflowInRoot(pane)) {
    window.setTimeout(() => {
      clickFirstMatchInOpenMenus((c) => {
        if (!c.includes("block") || c.includes("unblock")) return false;
        return c.includes("sender") || c.includes("block sender") || /^block\b/.test(c);
      });
    }, 120);
    return true;
  }
  return false;
}

/**
 * Same as tryBlockSender but prefers entries that mention the sender's domain.
 */
export function tryBlockDomain() {
  const pane = getReadingPaneRoot();
  const roots = pane ? [pane, document.body] : [document.body];
  for (const root of roots) {
    if (
      clickFirstMatch(root, (c) => {
        if (!c.includes("block")) return false;
        if (c.includes("unblock")) return false;
        return c.includes("domain");
      })
    ) {
      return true;
    }
  }
  if (pane && tryClickOverflowInRoot(pane)) {
    window.setTimeout(() => {
      clickFirstMatchInOpenMenus((c) => {
        if (!c.includes("block") || c.includes("unblock")) return false;
        return c.includes("domain");
      });
    }, 120);
    return true;
  }
  return false;
}

function getLikelyComposeRoot() {
  return (
    document.querySelector('[aria-label*="compose" i]')?.closest?.("form") ||
    document.querySelector('[data-app-section*="Compose" i]') ||
    document.querySelector('[role="dialog"] [aria-label*="Message body" i]')?.closest?.('[role="dialog"]') ||
    document.activeElement?.closest?.('[role="dialog"]') ||
    null
  );
}

/** Best-effort: open Signatures / Insert signature in an active compose dialog. */
export function tryOpenSignatureUi() {
  const compose = getLikelyComposeRoot();
  if (!compose) {
    return false;
  }
  if (
    clickFirstMatch(compose, (c) => {
      return (
        c.includes("signature") &&
        (c.includes("insert") || c.includes("signatures") || c.includes("manage"))
      );
    })
  ) {
    return true;
  }
  if (tryClickOverflowInRoot(compose)) {
    window.setTimeout(() => {
      clickFirstMatchInOpenMenus((c) => c.includes("signature"));
    }, 120);
    return true;
  }
  return false;
}

export function openReportIssuePage() {
  try {
    window.open(ISSUES_URL, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}
