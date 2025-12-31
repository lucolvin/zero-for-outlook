// Snooze overlay feature module
import { isScheduledView } from "../core/dom.js";
import { hasSelectedMessage } from "../core/messageList.js";
import { settings } from "../core/settings.js";

// State
let snoozeOverlay = null;
let snoozeButtons = [];
let snoozeActiveIndex = -1;

// Button finding
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

export function clickUnsnooze() {
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

export function openSnoozeAndApplyPreset(preset) {
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

// Styles
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

export function closeSnoozeOverlay() {
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

export function moveSnoozeSelection(direction) {
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

export function openSnoozeOverlay() {
  ensureSnoozeStyles();
  if (snoozeOverlay) {
    return;
  }
  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;
  
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

export function updateSnoozeOverlayTheme() {
  if (!snoozeOverlay) return;
  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;
  
  const backdrop = snoozeOverlay;
  const modal = backdrop.querySelector(".oz-snooze-modal");
  if (!modal) return;

  backdrop.className =
    "oz-snooze-backdrop " + (darkModeEnabled ? "oz-snooze-dark" : "oz-snooze-light");
  modal.className =
    "oz-snooze-modal " + (darkModeEnabled ? "oz-snooze-dark" : "oz-snooze-light");
}

// Helper for keyboard handler to check if overlay is open
export function isSnoozeOverlayOpen() {
  return snoozeOverlay !== null;
}

// Helper for keyboard handler to get active button
export function getActiveSnoozeButton() {
  if (snoozeActiveIndex >= 0 && snoozeButtons && snoozeButtons[snoozeActiveIndex]) {
    return snoozeButtons[snoozeActiveIndex];
  }
  return null;
}

