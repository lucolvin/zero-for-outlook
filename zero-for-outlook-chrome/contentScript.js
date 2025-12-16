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
  let darkModeEnabled = true;
  /** @type {"auto" | "sidebar"} */
  let vimContext = "auto";

  function loadSettings() {
    try {
      browserApi.storage.sync.get(
        { undoShortcut: DEFAULT_UNDO_SHORTCUT, vimEnabled: true, darkModeEnabled: true },
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
            if (typeof items.darkModeEnabled === "boolean") {
              darkModeEnabled = items.darkModeEnabled;
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

  function isScheduledView() {
    try {
      const url = window.location.href || "";
      if (!url) return false;

      // Support multiple Outlook Scheduled-folder URL shapes, e.g.:
      // - https://outlook.office.com/mail/scheduled/
      // - https://outlook.office.com/mail/0/scheduled
      // - https://outlook.office.com/mail/scheduled?view=...
      // - https://outlook.office.com/mail/0/scheduled?view=...
      //
      // We look for a "/mail/<something>/scheduled" pattern where <something>
      // may be empty or a short identifier like "0".
      const scheduledPattern = /\/mail\/[^/]*\/scheduled(?:[/?#]|$)/;
      if (scheduledPattern.test(url)) {
        return true;
      }

      // Fallback: older style URLs that might omit the intermediate segment.
      if (url.indexOf("/mail/scheduled/") !== -1 || url.endsWith("/mail/scheduled")) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  function clickUnsnooze() {
    // Try common button patterns first
    const selectors = [
      'button[aria-label="Unsnooze"]',
      'button[title="Unsnooze"]',
      'button[name="Unsnooze"]'
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        /** @type {HTMLElement} */ (btn).click();
        return true;
      }
    }

    // Fallback: look for a label or button whose text is exactly "Unsnooze"
    const labelEls = Array.from(document.querySelectorAll("span, div, button"));
    for (const el of labelEls) {
      const text = (el.textContent || "").trim();
      if (text === "Unsnooze") {
        const button = el.closest("button") || el;
        /** @type {HTMLElement} */ (button).click();
        return true;
      }
    }
    return false;
  }

  function findSnoozeButton() {
    const selectors = [
      'button[name="Snooze"]',
      'button[aria-label="Snooze"]',
      'button[aria-label^="Snooze"]',
      'button[title="Snooze"]',
      'button[title^="Snooze"]'
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) return btn;
    }

    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      return text === "snooze";
    });
  }

  // In some Outlook views (notably the Scheduled folder), the built‑in
  // "Unsnooze" command is only wired up after the Snooze dropdown has
  // been opened at least once after page load. We "prime" it by
  // briefly toggling the Snooze button when our popup opens.
  function primeSnoozeDropdown() {
    try {
      const snoozeButton = findSnoozeButton();
      if (!snoozeButton) return;
      /** @type {HTMLElement} */ (snoozeButton).click();
      // Close it again shortly after so the menu does not stay
      // visually open on top of our overlay.
      window.setTimeout(() => {
        try {
          const btn = findSnoozeButton();
          if (btn) {
            /** @type {HTMLElement} */ (btn).click();
          }
        } catch (e) {
          // Best‑effort only.
        }
      }, 120);
    } catch (e) {
      // Best‑effort only; if this fails we still fall back to the
      // normal Unsnooze lookup logic.
    }
  }

  /**
   * Best-effort helper to read the concrete date/time strings that Outlook shows
   * in its own Snooze menu (e.g. "5:00 AM", "Wed 8:00 AM") so that we can
   * mirror those in our overlay instead of using vague descriptions.
   *
   * If we can't find any of these elements in the DOM (because the menu
   * hasn't been rendered yet, or Outlook's markup has changed), we simply
   * return an empty object and fall back to our built-in text.
   *
   * @returns {{ laterToday?: string; tomorrow?: string; thisWeekend?: string; nextWeek?: string }}
   */
  function getNativeSnoozePresetTimes() {
    const result = {};

    /**
     * Try to find a secondary text span inside the given Snooze button element.
     * Outlook currently uses classes like "secondaryTextMenu secondaryText-356",
     * but we keep this fairly loose so minor class changes don't break us.
     *
     * @param {HTMLElement | null} btn
     */
    function findSecondaryText(btn) {
      if (!btn) return "";
      const span =
        btn.querySelector(".secondaryTextMenu") ||
        btn.querySelector('span[class*="secondaryText"]');
      if (!span) return "";
      const text = (span.textContent || "").trim();
      return text;
    }

    const presets = [
      { key: "laterToday", name: "Later today" },
      { key: "tomorrow", name: "Tomorrow" },
      { key: "thisWeekend", name: "This weekend" },
      { key: "nextWeek", name: "Next week" }
    ];

    for (const preset of presets) {
      try {
        const btn = /** @type {HTMLElement | null} */ (
          document.querySelector(
            `button[name="${preset.name}"], button[aria-label^="${preset.name}"], button[aria-label="${preset.name}"]`
          )
        );
        const text = findSecondaryText(btn);
        if (text) {
          result[preset.key] = text;
        }
      } catch (e) {
        // Best-effort; ignore lookup errors and continue.
      }
    }

    return result;
  }

  /**
   * After we've toggled Outlook's Snooze dropdown, poll briefly for the
   * concrete preset times and hydrate our overlay's secondary labels once
   * they are available. Until then, the descriptions remain hidden/empty.
   *
   * @param {HTMLElement} modal
   */
  function hydrateSnoozeDescriptions(modal) {
    if (!modal) return;
    const maxAttempts = 8;
    const delay = 80;
    let attempts = 0;

    function tryHydrate() {
      attempts += 1;
      const nativeTimes = getNativeSnoozePresetTimes();
      let updated = false;

      /** @type {{ key: keyof ReturnType<typeof getNativeSnoozePresetTimes>; selector: string }[]} */
      const mapping = [
        { key: "laterToday", selector: '[data-oz-snooze="laterToday"] .oz-snooze-secondary' },
        { key: "tomorrow", selector: '[data-oz-snooze="tomorrow"] .oz-snooze-secondary' },
        { key: "thisWeekend", selector: '[data-oz-snooze="thisWeekend"] .oz-snooze-secondary' },
        { key: "nextWeek", selector: '[data-oz-snooze="nextWeek"] .oz-snooze-secondary' }
      ];

      for (const item of mapping) {
        const value = nativeTimes[item.key];
        if (!value) continue;
        const el = /** @type {HTMLElement | null} */ (
          modal.querySelector(item.selector)
        );
        if (!el) continue;
        if (!el.textContent || !el.textContent.trim()) {
          el.textContent = value;
          updated = true;
        }
      }

      if (!updated && attempts < maxAttempts) {
        window.setTimeout(tryHydrate, delay);
      }
    }

    tryHydrate();
  }

  function clickSnoozePreset(presetName) {
    const labels = {
      laterToday: "Later today",
      tomorrow: "Tomorrow",
      thisWeekend: "This weekend",
      nextWeek: "Next week",
      chooseDate: "Choose a date"
    };

    const label = labels[presetName];
    if (!label) return false;

    const selector = `button[name="${label}"], button[aria-label^="${label}"], button[aria-label="${label}"]`;
    const candidates = Array.from(document.querySelectorAll(selector));
    if (candidates.length) {
      const btn = /** @type {HTMLElement} */ (candidates[0]);
      btn.click();
      return true;
    }

    const buttons = Array.from(document.querySelectorAll("button"));
    const match = buttons.find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      return text === label.toLowerCase();
    });
    if (match) {
      match.click();
      return true;
    }
    return false;
  }

  function openSnoozeAndApplyPreset(preset) {
    const snoozeButton = findSnoozeButton();
    if (!snoozeButton) {
      return { ok: false, error: "No Snooze button found on this page." };
    }

    /** @type {HTMLElement} */ (snoozeButton).click();

    const maxAttempts = 8;
    const delay = 80;
    let attempts = 0;

    function trySelect() {
      attempts += 1;
      if (clickSnoozePreset(preset)) {
        return;
      }
      if (attempts >= maxAttempts) {
        return;
      }
      window.setTimeout(trySelect, delay);
    }

    window.setTimeout(trySelect, delay);
    return { ok: true };
  }

  let snoozeOverlay = null;
  let snoozeButtons = [];
  let snoozeActiveIndex = -1;

  function ensureSnoozeStyles() {
    if (document.getElementById("oz-snooze-style")) return;
    const style = document.createElement("style");
    style.id = "oz-snooze-style";
    style.textContent = `
.oz-snooze-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Very high z-index so we always sit above Outlook's Snooze dropdown */
  z-index: 2147483647;
}

.oz-snooze-backdrop.oz-snooze-dark {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.25), transparent 55%),
    radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.3), transparent 55%),
    rgba(15, 23, 42, 0.32);
}

.oz-snooze-backdrop.oz-snooze-light {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.2), transparent 55%),
    rgba(15, 23, 42, 0.12);
}

.oz-snooze-modal {
  min-width: 300px;
  max-width: 360px;
  border-radius: 12px;
  padding: 16px 16px 12px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.oz-snooze-modal.oz-snooze-dark {
  background-color: #020617;
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.9),
    0 0 0 1px rgba(148, 163, 184, 0.5);
  color: #e5e7eb;
}

.oz-snooze-modal.oz-snooze-light {
  background-color: #ffffff;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.16),
    0 0 0 1px rgba(148, 163, 184, 0.45);
  color: #111827;
}

.oz-snooze-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.oz-snooze-title {
  font-size: 1.05rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.oz-snooze-hint {
  margin: 0 0 10px;
  font-size: 0.8rem;
  opacity: 0.8;
}

.oz-snooze-close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px 4px;
}

.oz-snooze-close:hover {
  color: #e5e7eb;
}

.oz-snooze-info {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: transparent;
  color: inherit;
  cursor: default;
  font-size: 0.7rem;
  line-height: 1;
  padding: 2px 6px;
  opacity: 0.8;
}

.oz-snooze-info:hover {
  opacity: 1;
}

.oz-snooze-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oz-snooze-section-divider {
  padding-top: 4px;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
  margin-top: 4px;
}

.oz-snooze-button {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.55);
  padding: 11px 13px;
  font-size: 1rem;
  background-color: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease,
    transform 60ms ease;
}

.oz-snooze-modal.oz-snooze-dark .oz-snooze-button {
  background-color: rgba(15, 23, 42, 0.85);
}

.oz-snooze-modal.oz-snooze-light .oz-snooze-button {
  background-color: #f9fafb;
}

.oz-snooze-button:hover {
  border-color: rgba(96, 165, 250, 0.95);
  box-shadow:
    0 0 0 1px rgba(37, 99, 235, 0.5),
    0 10px 28px rgba(15, 23, 42, 0.9);
  transform: translateY(-0.5px);
}

.oz-snooze-button:active {
  transform: translateY(0);
  box-shadow: none;
}

.oz-snooze-button-ghost {
  background: transparent;
}

.oz-snooze-label {
  font-weight: 500;
  font-size: 1rem;
}

.oz-snooze-secondary {
  font-size: 0.9rem;
  color: inherit;
}

.oz-snooze-button.oz-snooze-selected {
  border-color: rgba(37, 99, 235, 0.95);
  box-shadow:
    0 0 0 2px rgba(59, 130, 246, 0.55),
    0 10px 28px rgba(15, 23, 42, 0.9);
}
`;
    document.documentElement.appendChild(style);
  }

  function closeSnoozeOverlay() {
    if (snoozeOverlay && snoozeOverlay.parentNode) {
      snoozeOverlay.parentNode.removeChild(snoozeOverlay);
    }
    snoozeOverlay = null;
    snoozeButtons = [];
    snoozeActiveIndex = -1;
  }

  function setSnoozeSelection(index) {
    if (!snoozeOverlay) return;
    if (!snoozeButtons || !snoozeButtons.length) return;
    const clamped = Math.max(0, Math.min(snoozeButtons.length - 1, index));
    snoozeActiveIndex = clamped;
    snoozeButtons.forEach((btn, i) => {
      if (!btn) return;
      if (i === clamped) {
        btn.classList.add("oz-snooze-selected");
      } else {
        btn.classList.remove("oz-snooze-selected");
      }
    });
  }

  function moveSnoozeSelection(direction) {
    if (!snoozeButtons || !snoozeButtons.length) return;
    if (snoozeActiveIndex === -1) {
      setSnoozeSelection(0);
      return;
    }
    const total = snoozeButtons.length;
    let nextIndex = snoozeActiveIndex;
    if (direction === "down") {
      // Wrap from last item back to the first
      nextIndex = (snoozeActiveIndex + 1) % total;
    } else {
      // Wrap from first item up to the last
      nextIndex = (snoozeActiveIndex - 1 + total) % total;
    }
    setSnoozeSelection(nextIndex);
  }

  function handleSnoozeClick(preset) {
    closeSnoozeOverlay();
    if (preset === "unsnooze") {
      clickUnsnooze();
    } else {
      openSnoozeAndApplyPreset(preset);
    }
  }

  function openSnoozeOverlay() {
    ensureSnoozeStyles();
    if (snoozeOverlay) {
      return;
    }
    const backdrop = document.createElement("div");
    backdrop.className = "oz-snooze-backdrop " + (darkModeEnabled ? "oz-snooze-dark" : "oz-snooze-light");

    const modal = document.createElement("div");
    modal.className = "oz-snooze-modal " + (darkModeEnabled ? "oz-snooze-dark" : "oz-snooze-light");

    if (isScheduledView()) {
      // Ensure Outlook's own Snooze/Unsnooze menu has been initialized
      // so that the "Unsnooze" command exists when we try to trigger it.
      primeSnoozeDropdown();
      modal.innerHTML = `
        <div class="oz-snooze-header">
          <div class="oz-snooze-title">
            Unsnooze
            <button
              type="button"
              class="oz-snooze-info"
              aria-label="Unsnooze keyboard help"
              title="Use j / k to navigate and Enter to select · Esc to close"
            >
              ?
            </button>
          </div>
          <button type="button" class="oz-snooze-close" aria-label="Close unsnooze menu">Esc</button>
        </div>
        <div class="oz-snooze-section">
          <button type="button" class="oz-snooze-button" data-oz-snooze="unsnooze">
            <span class="oz-snooze-label">Unsnooze</span>
            <span class="oz-snooze-secondary">Move back to Inbox</span>
          </button>
        </div>
      `;
    } else {
      // Just like the Unsnooze view, we want Outlook's own Snooze dropdown
      // to be opened at least once so that its preset DOM nodes (with the
      // concrete times like "5:00 AM") exist before we try to read them.
      // This briefly toggles the Snooze button and then closes it again.
      primeSnoozeDropdown();
      modal.innerHTML = `
        <div class="oz-snooze-header">
          <div class="oz-snooze-title">
            Snooze
            <button
              type="button"
              class="oz-snooze-info"
              aria-label="Snooze keyboard help"
              title="Use j / k to navigate and Enter to select · Esc to close"
            >
              ?
            </button>
          </div>
          <button type="button" class="oz-snooze-close" aria-label="Close snooze menu">Esc</button>
        </div>
        <div class="oz-snooze-section">
          <button type="button" class="oz-snooze-button" data-oz-snooze="laterToday">
            <span class="oz-snooze-label">Later today</span>
            <span class="oz-snooze-secondary"></span>
          </button>
          <button type="button" class="oz-snooze-button" data-oz-snooze="tomorrow">
            <span class="oz-snooze-label">Tomorrow</span>
            <span class="oz-snooze-secondary"></span>
          </button>
          <button type="button" class="oz-snooze-button" data-oz-snooze="thisWeekend">
            <span class="oz-snooze-label">This weekend</span>
            <span class="oz-snooze-secondary"></span>
          </button>
          <button type="button" class="oz-snooze-button" data-oz-snooze="nextWeek">
            <span class="oz-snooze-label">Next week</span>
            <span class="oz-snooze-secondary"></span>
          </button>
        </div>
        <div class="oz-snooze-section oz-snooze-section-divider">
          <button type="button" class="oz-snooze-button oz-snooze-button-ghost" data-oz-snooze="chooseDate">
            <span class="oz-snooze-label">Choose a date…</span>
          </button>
        </div>
      `;
    }

    backdrop.appendChild(modal);

    snoozeButtons = Array.from(modal.querySelectorAll("[data-oz-snooze]"));

    // Register the overlay before we attempt to set the initial selection so
    // that `setSnoozeSelection` doesn't early‑return due to a null overlay.
    document.documentElement.appendChild(backdrop);
    snoozeOverlay = backdrop;

    // Now that the underlying Snooze dropdown has been toggled, start
    // hydrating the secondary labels with the real times once they appear.
    hydrateSnoozeDescriptions(modal);

    setSnoozeSelection(0);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeSnoozeOverlay();
      }
    });

    modal.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (!target) return;
      if (target.classList.contains("oz-snooze-close")) {
        closeSnoozeOverlay();
        return;
      }
      const btn = target.closest("[data-oz-snooze]");
      if (!btn) return;
      const preset = btn.getAttribute("data-oz-snooze");
      if (!preset) return;
      handleSnoozeClick(preset);
    });
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

  function hasSelectedMessage() {
    const rows = getMessageRows();
    if (!rows.length) return false;
    return getCurrentRowIndex(rows) !== -1;
  }

  /**
   * Ask Outlook to extend the current selection using its built‑in
   * Shift+ArrowUp / Shift+ArrowDown handling.
   *
   * We do this by synthesizing a native-looking keydown event for the
   * appropriate arrow key with `shiftKey: true`. Our own keyboard
   * handler ignores synthetic events (`event.isTrusted === false`),
   * so this will only be processed by Outlook itself.
   *
   * @param {"up" | "down"} direction
   */
  function sendShiftArrow(direction) {
    const key = direction === "down" ? "ArrowDown" : "ArrowUp";
    const keyCode = direction === "down" ? 40 : 38;

    /** @type {Element | null} */
    const targetEl = document.activeElement || document.body;
    if (!targetEl) return;

    const evt = new KeyboardEvent("keydown", {
      key,
      code: key,
      keyCode,
      which: keyCode,
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      bubbles: true,
      cancelable: true
    });

    targetEl.dispatchEvent(evt);
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
      // Ignore synthetic events (including our own Shift+Arrow events)
      // so that we only ever react to real user key presses.
      if (!event.isTrusted) {
        return;
      }

      // Ignore if user is typing in an input/textarea/contentEditable
      if (isEditableElement(event.target)) {
        // When typing, fall back to default context.
        vimContext = "auto";
        return;
      }

      const key = (event.key || "").toLowerCase();

      // Multi‑select support: Shift+j / Shift+k behave like
      // Shift+ArrowDown / Shift+ArrowUp in the message list, allowing
      // you to select ranges of messages that can then be snoozed or
      // archived together using Outlook's own commands.
      if (
        vimEnabled &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        (key === "j" || key === "k") &&
        !snoozeOverlay
      ) {
        event.preventDefault();
        event.stopPropagation();
        sendShiftArrow(key === "j" ? "down" : "up");
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
        if (snoozeOverlay) {
          if (key === "j") {
            event.preventDefault();
            event.stopPropagation();
            moveSnoozeSelection("down");
            return;
          }
          if (key === "k") {
            event.preventDefault();
            event.stopPropagation();
            moveSnoozeSelection("up");
            return;
          }
          if (key === "enter" && snoozeButtons && snoozeButtons.length && snoozeActiveIndex >= 0) {
            event.preventDefault();
            event.stopPropagation();
            const btn = snoozeButtons[snoozeActiveIndex];
            if (btn) {
              const preset = btn.getAttribute("data-oz-snooze");
              if (preset) {
                handleSnoozeClick(preset);
              }
            }
            return;
          }
        }
        if (key === "s") {
          event.preventDefault();
          event.stopPropagation();
          if (snoozeOverlay) {
            closeSnoozeOverlay();
          } else {
            if (hasSelectedMessage()) {
              openSnoozeOverlay();
            }
          }
          return;
        }
        if (key === "escape" && snoozeOverlay) {
          event.preventDefault();
          event.stopPropagation();
          closeSnoozeOverlay();
          return;
        }
      }

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
      if (changes.darkModeEnabled && typeof changes.darkModeEnabled.newValue === "boolean") {
        darkModeEnabled = changes.darkModeEnabled.newValue;
      }
    });
  } catch (e) {
    // Ignore if storage events are not available
  }

  try {
    browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || message.type !== "oz-snooze") {
        return;
      }
      try {
        const preset = message.preset;
        const result = openSnoozeAndApplyPreset(preset);
        if (result && result.ok) {
          sendResponse({ ok: true });
        } else {
          sendResponse(result || { ok: false, error: "Could not apply snooze." });
        }
      } catch (e) {
        sendResponse({ ok: false, error: "Error applying snooze." });
      }
      return true;
    });
  } catch (e) {
    // Ignore if runtime messaging is not available
  }

  window.addEventListener("keydown", onKeyDown, true);
})();



