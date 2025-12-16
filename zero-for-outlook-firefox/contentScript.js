(() => {
  // zero-for-outlook-firefox/src/content/index.js
  (() => {
    const browserApi = typeof chrome !== "undefined" ? chrome : browser;
    const DEFAULT_UNDO_SHORTCUT = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: "z"
      // normalized to lower-case
    };
    const DEFAULT_COMMAND_SHORTCUT = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: true,
      key: "k"
    };
    let undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
    let commandShortcut = { ...DEFAULT_COMMAND_SHORTCUT };
    let vimEnabled = true;
    let darkModeEnabled = true;
    let vimContext = "auto";
    function loadSettings() {
      try {
        browserApi.storage.sync.get(
          {
            undoShortcut: DEFAULT_UNDO_SHORTCUT,
            commandShortcut: DEFAULT_COMMAND_SHORTCUT,
            vimEnabled: true,
            darkModeEnabled: true
          },
          (items) => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              return;
            }
            if (items) {
              if (items.undoShortcut) {
                undoShortcut = {
                  ...DEFAULT_UNDO_SHORTCUT,
                  ...items.undoShortcut
                };
              }
              if (items.commandShortcut) {
                commandShortcut = {
                  ...DEFAULT_COMMAND_SHORTCUT,
                  ...items.commandShortcut
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
      return !!shortcut && !!key && key === (shortcut.key || "").toLowerCase() && !!event.ctrlKey === !!shortcut.ctrlKey && !!event.shiftKey === !!shortcut.shiftKey && !!event.altKey === !!shortcut.altKey && !!event.metaKey === !!shortcut.metaKey;
    }
    function formatShortcutDisplay(shortcut) {
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
    function findUndoButton() {
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
    function triggerUndo() {
      const button = findUndoButton();
      if (!button) {
        return;
      }
      const beforeRows = getMessageRows();
      const beforeKeys = buildRowKeySet(beforeRows);
      const beforeCount = beforeRows.length;
      button.click();
      refocusRestoredMessage(beforeKeys, beforeCount);
    }
    function isScheduledView() {
      try {
        const url = window.location.href || "";
        if (!url) return false;
        const scheduledPattern = /\/mail\/[^/]*\/scheduled(?:[/?#]|$)/;
        if (scheduledPattern.test(url)) {
          return true;
        }
        if (url.indexOf("/mail/scheduled/") !== -1 || url.endsWith("/mail/scheduled")) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
    function isInboxView() {
      try {
        const url = window.location.href || "";
        if (!url) return false;
        const inboxPattern = /\/mail\/[^/]*\/inbox(?:[/?#]|$)/i;
        if (inboxPattern.test(url)) {
          return true;
        }
        if (url.toLowerCase().indexOf("/mail/inbox/") !== -1 || url.toLowerCase().endsWith("/mail/inbox")) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
    function clickUnsnooze() {
      const selectors = [
        'button[aria-label="Unsnooze"]',
        'button[title="Unsnooze"]',
        'button[name="Unsnooze"]'
      ];
      for (const selector of selectors) {
        const btn = document.querySelector(selector);
        if (btn) {
          btn.click();
          return true;
        }
      }
      const labelEls = Array.from(document.querySelectorAll("span, div, button"));
      for (const el of labelEls) {
        const text = (el.textContent || "").trim();
        if (text === "Unsnooze") {
          const button = el.closest("button") || el;
          button.click();
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
    function primeSnoozeDropdown() {
      try {
        const snoozeButton = findSnoozeButton();
        if (!snoozeButton) return;
        snoozeButton.click();
        window.setTimeout(() => {
          try {
            const btn = findSnoozeButton();
            if (btn) {
              btn.click();
            }
          } catch (e) {
          }
        }, 120);
      } catch (e) {
      }
    }
    function getNativeSnoozePresetTimes() {
      const result = {};
      function findSecondaryText(btn) {
        if (!btn) return "";
        const span = btn.querySelector(".secondaryTextMenu") || btn.querySelector('span[class*="secondaryText"]');
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
          const btn = (
            /** @type {HTMLElement | null} */
            document.querySelector(
              `button[name="${preset.name}"], button[aria-label^="${preset.name}"], button[aria-label="${preset.name}"]`
            )
          );
          const text = findSecondaryText(btn);
          if (text) {
            result[preset.key] = text;
          }
        } catch (e) {
        }
      }
      return result;
    }
    function hydrateSnoozeDescriptions(modal) {
      if (!modal) return;
      const maxAttempts = 8;
      const delay = 80;
      let attempts = 0;
      function tryHydrate() {
        attempts += 1;
        const nativeTimes = getNativeSnoozePresetTimes();
        let updated = false;
        const mapping = [
          { key: "laterToday", selector: '[data-oz-snooze="laterToday"] .oz-snooze-secondary' },
          { key: "tomorrow", selector: '[data-oz-snooze="tomorrow"] .oz-snooze-secondary' },
          { key: "thisWeekend", selector: '[data-oz-snooze="thisWeekend"] .oz-snooze-secondary' },
          { key: "nextWeek", selector: '[data-oz-snooze="nextWeek"] .oz-snooze-secondary' }
        ];
        for (const item of mapping) {
          const value = nativeTimes[item.key];
          if (!value) continue;
          const el = (
            /** @type {HTMLElement | null} */
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
        const btn = (
          /** @type {HTMLElement} */
          candidates[0]
        );
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
      snoozeButton.click();
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
    let summaryOverlay = null;
    let summaryContentEl = null;
    let inboxZeroOverlay = null;
    let inboxZeroObserver = null;
    let lastInboxCount = null;
    function ensureFireworksStyles() {
      if (document.getElementById("oz-fireworks-style")) return;
      const style = document.createElement("style");
      style.id = "oz-fireworks-style";
      style.textContent = `
.oz-fireworks-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483646;
  overflow: hidden;
}

.oz-fireworks-message {
  position: absolute;
  top: 16%;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 999px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
  background: rgba(250, 250, 250, 0.96);
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.45),
    0 0 0 1px rgba(148, 163, 184, 0.55);
}

.oz-firework {
  position: absolute;
  width: 4px;
  height: 12px;
  border-radius: 2px;
  background: #facc15;
  opacity: 0;
  transform-origin: center bottom;
  transform: translate(-50%, 0) rotate(0deg) scale(1);
  animation: oz-confetti-shoot 2600ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}

.oz-firework:nth-child(3n) {
  background: #38bdf8;
}

.oz-firework:nth-child(3n+1) {
  background: #34d399;
}

.oz-firework:nth-child(4n) {
  background: #f97316;
}

@keyframes oz-confetti-shoot {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) rotate(0deg) scale(1);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -40vh) rotate(8deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -85vh) rotate(26deg) scale(1.1);
  }
}
`;
      document.documentElement.appendChild(style);
    }
    function hideInboxZeroFireworks() {
      if (inboxZeroOverlay && inboxZeroOverlay.parentNode) {
        inboxZeroOverlay.parentNode.removeChild(inboxZeroOverlay);
      }
      inboxZeroOverlay = null;
    }
    function showInboxZeroFireworks() {
      try {
        ensureFireworksStyles();
        hideInboxZeroFireworks();
        const backdrop = document.createElement("div");
        backdrop.className = "oz-fireworks-backdrop";
        const message = document.createElement("div");
        message.className = "oz-fireworks-message";
        message.textContent = "Inbox zero \u2013 nicely done!";
        backdrop.appendChild(message);
        const COLORS = ["#facc15", "#38bdf8", "#34d399", "#f97316", "#e879f9"];
        for (let i = 0; i < 40; i += 1) {
          const fw = document.createElement("div");
          fw.className = "oz-firework";
          const fromLeftSide = i % 2 === 0;
          const baseX = fromLeftSide ? 5 : 95;
          const spreadX = 40;
          const x = fromLeftSide ? baseX + Math.random() * spreadX : baseX - Math.random() * spreadX;
          const y = 94 + Math.random() * 3;
          const delay = 60 + Math.random() * 720;
          const color = COLORS[i % COLORS.length];
          fw.style.left = `${x}%`;
          fw.style.top = `${y}%`;
          fw.style.animationDelay = `${delay}ms`;
          fw.style.backgroundColor = color;
          const tilt = (Math.random() - 0.5) * 40;
          const initialTranslate = fromLeftSide ? -4 - Math.random() * 10 : 4 + Math.random() * 10;
          fw.style.transform = `translate(${initialTranslate}%, 0) rotate(${tilt}deg)`;
          backdrop.appendChild(fw);
        }
        document.documentElement.appendChild(backdrop);
        inboxZeroOverlay = backdrop;
        window.setTimeout(() => {
          try {
            hideInboxZeroFireworks();
          } catch (e) {
          }
        }, 6500);
      } catch (e) {
      }
    }
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
    function ensureSummaryStyles() {
      if (document.getElementById("oz-summary-style")) return;
      const style = document.createElement("style");
      style.id = "oz-summary-style";
      style.textContent = `
.oz-summary-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
}

.oz-summary-backdrop.oz-summary-dark {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.25), transparent 55%),
    radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.3), transparent 55%),
    rgba(15, 23, 42, 0.32);
}

.oz-summary-backdrop.oz-summary-light {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.2), transparent 55%),
    rgba(15, 23, 42, 0.12);
}

.oz-summary-modal {
  max-width: min(520px, 96vw);
  border-radius: 12px;
  padding: 14px 16px 12px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.oz-summary-modal.oz-summary-dark {
  background-color: #020617;
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.9),
    0 0 0 1px rgba(148, 163, 184, 0.5);
  color: #e5e7eb;
}

.oz-summary-modal.oz-summary-light {
  background-color: #ffffff;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.16),
    0 0 0 1px rgba(148, 163, 184, 0.45);
  color: #111827;
}

.oz-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.oz-summary-title {
  font-size: 1.02rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.oz-summary-chip {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  opacity: 0.85;
}

.oz-summary-close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px 4px;
}

.oz-summary-close:hover {
  opacity: 0.9;
}

.oz-summary-body {
  font-size: 0.9rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.oz-summary-body-error {
  color: #f97373;
}

.oz-summary-body-loading {
  opacity: 0.86;
}
`;
      document.documentElement.appendChild(style);
    }
    function closeSummaryOverlay() {
      if (summaryOverlay && summaryOverlay.parentNode) {
        summaryOverlay.parentNode.removeChild(summaryOverlay);
      }
      summaryOverlay = null;
      summaryContentEl = null;
    }
    function openSummaryOverlay(options) {
      const title = options && options.title || "Email summary";
      const body = options && options.body || "";
      const isError = !!(options && options.isError);
      const isLoading = !!(options && options.isLoading);
      ensureSummaryStyles();
      if (!summaryOverlay) {
        const backdrop = document.createElement("div");
        backdrop.className = "oz-summary-backdrop " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
        const modal2 = document.createElement("div");
        modal2.className = "oz-summary-modal " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
        modal2.innerHTML = `
        <div class="oz-summary-header">
          <div class="oz-summary-title">
            <span>Summary</span>
            <span class="oz-summary-chip">Gemini</span>
          </div>
          <button type="button" class="oz-summary-close" aria-label="Close summary">Esc</button>
        </div>
        <div class="oz-summary-body"></div>
      `;
        backdrop.appendChild(modal2);
        document.documentElement.appendChild(backdrop);
        summaryOverlay = backdrop;
        summaryContentEl = modal2.querySelector(".oz-summary-body");
        backdrop.addEventListener("click", (e) => {
          if (e.target === backdrop && !isLoading) {
            closeSummaryOverlay();
          }
        });
        const closeBtn = modal2.querySelector(".oz-summary-close");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            if (!isLoading) {
              closeSummaryOverlay();
            }
          });
        }
      }
      const modal = summaryOverlay.querySelector(".oz-summary-modal");
      if (modal) {
        const titleEl = modal.querySelector(".oz-summary-title span");
        if (titleEl) {
          titleEl.textContent = title;
        }
      }
      if (!summaryContentEl) {
        summaryContentEl = summaryOverlay.querySelector(".oz-summary-body");
      }
      if (summaryContentEl) {
        summaryContentEl.textContent = body;
        summaryContentEl.classList.remove("oz-summary-body-error", "oz-summary-body-loading");
        if (isError) {
          summaryContentEl.classList.add("oz-summary-body-error");
        } else if (isLoading) {
          summaryContentEl.classList.add("oz-summary-body-loading");
        }
      }
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
        nextIndex = (snoozeActiveIndex + 1) % total;
      } else {
        nextIndex = (snoozeActiveIndex - 1 + total) % total;
      }
      setSnoozeSelection(nextIndex);
    }
    let commandOverlay = null;
    let commandInput = null;
    let commandItems = [];
    let commandActiveIndex = -1;
    let commandFiltered = [];
    function ensureCommandBarStyles() {
      if (document.getElementById("oz-command-style")) return;
      const style = document.createElement("style");
      style.id = "oz-command-style";
      style.textContent = `
.oz-command-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 2147483647;
}

.oz-command-backdrop.oz-command-dark {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.25), transparent 55%),
    radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.3), transparent 55%),
    rgba(15, 23, 42, 0.32);
}

.oz-command-backdrop.oz-command-light {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.2), transparent 55%),
    rgba(15, 23, 42, 0.12);
}

.oz-command-modal {
  width: min(640px, 96vw);
  border-radius: 12px;
  overflow: hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.oz-command-modal,
.oz-command-modal * {
  box-sizing: border-box;
}

.oz-command-modal.oz-command-dark {
  background-color: #020617;
  box-shadow:
    0 22px 40px rgba(15, 23, 42, 0.9),
    0 0 0 1px rgba(148, 163, 184, 0.55);
  color: #e5e7eb;
}

.oz-command-modal.oz-command-light {
  background-color: #ffffff;
  box-shadow:
    0 16px 32px rgba(15, 23, 42, 0.16),
    0 0 0 1px rgba(148, 163, 184, 0.45);
  color: #111827;
}

.oz-command-input-wrapper {
  position: relative;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.4);
}

.oz-command-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.8);
  color: #e5e7eb;
  padding: 8px 9px 7px 28px;
  font-size: 0.95rem;
  outline: none;
}

.oz-command-modal.oz-command-light .oz-command-input {
  background: #f9fafb;
  color: #111827;
}

.oz-command-input::placeholder {
  color: rgba(148, 163, 184, 0.8);
}

.oz-command-input-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  opacity: 0.8;
  pointer-events: none;
}

.oz-command-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 4px 4px 6px;
}

.oz-command-empty {
  padding: 10px 12px 12px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.oz-command-item {
  border-radius: 8px;
  padding: 7px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition:
    background-color 90ms ease,
    transform 60ms ease;
}

.oz-command-item-main {
  display: flex;
  flex-direction: column;
}

.oz-command-item-title {
  font-size: 0.93rem;
  font-weight: 500;
}

.oz-command-item-subtitle {
  font-size: 0.8rem;
  opacity: 0.82;
}

.oz-command-item-shortcut {
  font-size: 0.75rem;
  opacity: 0.78;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  padding: 3px 7px 2px;
}

.oz-command-modal.oz-command-dark .oz-command-item {
  color: #e5e7eb;
}

.oz-command-modal.oz-command-light .oz-command-item {
  color: #111827;
}

.oz-command-item:hover {
  transform: translateY(-0.5px);
}

.oz-command-modal.oz-command-dark .oz-command-item:hover {
  background-color: rgba(31, 41, 55, 0.95);
}

.oz-command-modal.oz-command-light .oz-command-item:hover {
  background-color: #f3f4f6;
}

.oz-command-item-active {
  transform: translateY(-0.5px);
}

.oz-command-modal.oz-command-dark .oz-command-item-active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(129, 140, 248, 0.24));
}

.oz-command-modal.oz-command-light .oz-command-item-active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(129, 140, 248, 0.16));
}
`;
      document.documentElement.appendChild(style);
    }
    const COMMANDS = [
      {
        id: "undo",
        title: "Undo last action",
        subtitle: "Trigger Outlook\u2019s built-in Undo for message actions",
        action: () => {
          triggerUndo();
        }
      },
      {
        id: "summarize-email",
        title: "Summarize current email",
        subtitle: "Use Gemini to highlight key points from the open message",
        shortcutHint: "Command bar \xB7 Gemini",
        action: () => {
          summarizeCurrentEmail();
        }
      },
      {
        id: "unsubscribe",
        title: "Unsubscribe",
        subtitle: "Find and click an unsubscribe link in the current email",
        shortcutHint: "Command bar",
        action: () => {
          clickUnsubscribeLink();
        }
      },
      {
        id: "snooze-later-today",
        title: "Snooze \u2013 Later today",
        subtitle: "Move selected message to later today",
        shortcutHint: "S, then preset",
        action: () => {
          openSnoozeAndApplyPreset("laterToday");
        }
      },
      {
        id: "snooze-tomorrow",
        title: "Snooze \u2013 Tomorrow",
        subtitle: "Move selected message to tomorrow morning",
        shortcutHint: "S, then preset",
        action: () => {
          openSnoozeAndApplyPreset("tomorrow");
        }
      },
      {
        id: "snooze-this-weekend",
        title: "Snooze \u2013 This weekend",
        subtitle: "Move selected message to this weekend",
        shortcutHint: "S, then preset",
        action: () => {
          openSnoozeAndApplyPreset("thisWeekend");
        }
      },
      {
        id: "snooze-next-week",
        title: "Snooze \u2013 Next week",
        subtitle: "Move selected message to next week",
        shortcutHint: "S, then preset",
        action: () => {
          openSnoozeAndApplyPreset("nextWeek");
        }
      },
      {
        id: "unsnooze",
        title: "Unsnooze",
        subtitle: "Move scheduled message back to Inbox",
        shortcutHint: "S, then Unsnooze",
        action: () => {
          clickUnsnooze();
        }
      },
      {
        id: "focus-sidebar",
        title: "Focus sidebar",
        subtitle: "Jump focus to folder list/navigation",
        shortcutHint: "h",
        action: () => {
          focusSidebar();
        }
      },
      {
        id: "focus-message-list",
        title: "Focus message list",
        subtitle: "Jump focus back to the message list",
        shortcutHint: "l (from sidebar)",
        action: () => {
          focusMessageListFromSidebar();
        }
      },
      {
        id: "settings",
        title: "Settings",
        subtitle: "Open extension options page",
        action: () => {
          try {
            browserApi.runtime.sendMessage(
              {
                type: "oz-open-options"
              },
              () => {
              }
            );
          } catch (e) {
            console.debug("Zero: Could not open options page:", e);
          }
        }
      }
    ];
    function scoreCommandMatch(cmd, query) {
      if (!query) return 1;
      const q = query.toLowerCase().trim();
      if (!q) return 1;
      const haystack = (cmd.title || "").toLowerCase() + " " + (cmd.subtitle || "").toLowerCase() + " " + (cmd.id || "").toLowerCase();
      if (haystack === q) return 100;
      if (haystack.startsWith(q)) return 50;
      if (haystack.indexOf(q) !== -1) return 25;
      return 0;
    }
    function getFilteredCommands(query) {
      const scored = COMMANDS.map((cmd) => ({
        cmd,
        score: scoreCommandMatch(cmd, query)
      }));
      return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.cmd);
    }
    function getCommandShortcutHint(cmd) {
      if (!cmd) return "";
      if (cmd.id === "undo") {
        return formatShortcutDisplay(undoShortcut);
      }
      return cmd.shortcutHint || "";
    }
    function requestEmailSummary(bodyText) {
      return new Promise((resolve) => {
        try {
          browserApi.runtime.sendMessage(
            {
              type: "oz-summarize-email",
              bodyText: bodyText || ""
            },
            (response) => {
              if (browserApi.runtime && browserApi.runtime.lastError) {
                resolve({
                  ok: false,
                  error: "Could not reach the background script for summarization. Is the extension enabled?"
                });
                return;
              }
              if (!response) {
                resolve({ ok: false, error: "Unexpected empty response from Gemini." });
                return;
              }
              resolve(response);
            }
          );
        } catch (e) {
          resolve({
            ok: false,
            error: "Unexpected error while requesting a summary from the extension."
          });
        }
      });
    }
    function summarizeCurrentEmail() {
      const bodyText = getCurrentEmailText();
      if (!bodyText) {
        openSummaryOverlay({
          title: "Email summary",
          body: "Could not find any visible email content to summarize.",
          isError: true
        });
        return;
      }
      openSummaryOverlay({
        title: "Summarizing\u2026",
        body: "Summarizing the current email with Gemini. This usually takes a moment.",
        isLoading: true
      });
      requestEmailSummary(bodyText).then((result) => {
        if (!result || !result.ok) {
          const msg = result && result.error || "Gemini could not generate a summary. Please try again in a moment.";
          openSummaryOverlay({
            title: "Summary unavailable",
            body: msg,
            isError: true
          });
          return;
        }
        const summary = result && result.summary || "";
        if (!summary) {
          openSummaryOverlay({
            title: "Summary unavailable",
            body: "Gemini returned an empty summary for this email.",
            isError: true
          });
          return;
        }
        openSummaryOverlay({
          title: "Email summary",
          body: summary,
          isError: false
        });
      });
    }
    function closeCommandOverlay() {
      if (commandOverlay && commandOverlay.parentNode) {
        commandOverlay.parentNode.removeChild(commandOverlay);
      }
      commandOverlay = null;
      commandInput = null;
      commandItems = [];
      commandActiveIndex = -1;
      commandFiltered = [];
    }
    function setCommandSelection(index) {
      if (!commandItems || !commandItems.length) return;
      const clamped = Math.max(0, Math.min(commandItems.length - 1, index));
      commandActiveIndex = clamped;
      commandItems.forEach((el, i) => {
        if (!el) return;
        if (i === clamped) {
          el.classList.add("oz-command-item-active");
        } else {
          el.classList.remove("oz-command-item-active");
        }
      });
    }
    function renderCommandList(query) {
      if (!commandOverlay) return;
      const list = commandOverlay.querySelector(".oz-command-list");
      const empty = commandOverlay.querySelector(".oz-command-empty");
      if (!list) return;
      const filtered = getFilteredCommands(query);
      commandFiltered = filtered;
      list.innerHTML = "";
      commandItems = [];
      commandActiveIndex = -1;
      if (!filtered.length) {
        if (empty) {
          empty.textContent = query ? `No commands match \u201C${query}\u201D` : "No commands available.";
          empty.style.display = "block";
        }
        return;
      }
      if (empty) {
        empty.style.display = "none";
      }
      filtered.forEach((cmd, index) => {
        const item = document.createElement("div");
        item.className = "oz-command-item";
        item.innerHTML = `
        <div class="oz-command-item-main">
          <div class="oz-command-item-title">${cmd.title}</div>
          <div class="oz-command-item-subtitle">${cmd.subtitle || ""}</div>
        </div>
        <div class="oz-command-item-shortcut">${getCommandShortcutHint(cmd)}</div>
      `;
        item.addEventListener("mouseenter", () => {
          setCommandSelection(index);
        });
        item.addEventListener("click", () => {
          if (cmd && typeof cmd.action === "function") {
            try {
              cmd.action();
              closeCommandOverlay();
            } catch (e) {
              console.debug("Zero command action error:", e);
              closeCommandOverlay();
            }
          }
        });
        list.appendChild(item);
        commandItems.push(item);
      });
      setCommandSelection(0);
    }
    function openCommandOverlay() {
      ensureCommandBarStyles();
      if (commandOverlay) {
        if (commandInput) {
          commandInput.focus();
          commandInput.select();
        }
        return;
      }
      const backdrop = document.createElement("div");
      backdrop.className = "oz-command-backdrop " + (darkModeEnabled ? "oz-command-dark" : "oz-command-light");
      const modal = document.createElement("div");
      modal.className = "oz-command-modal " + (darkModeEnabled ? "oz-command-dark" : "oz-command-light");
      modal.innerHTML = `
      <div class="oz-command-input-wrapper">
        <span class="oz-command-input-icon">\u2318</span>
        <input
          class="oz-command-input"
          type="text"
          placeholder="Type a command\u2026"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="oz-command-list"></div>
      <div class="oz-command-empty"></div>
    `;
      backdrop.appendChild(modal);
      document.documentElement.appendChild(backdrop);
      commandOverlay = backdrop;
      commandInput = modal.querySelector(".oz-command-input");
      renderCommandList("");
      if (commandInput) {
        commandInput.addEventListener("input", () => {
          renderCommandList(commandInput.value || "");
        });
        window.setTimeout(() => {
          try {
            commandInput.focus();
            commandInput.select();
          } catch (e) {
          }
        }, 0);
      }
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          closeCommandOverlay();
        }
      });
    }
    function handleCommandOverlayKeydown(event) {
      if (!commandOverlay) return false;
      const key = (event.key || "").toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        closeCommandOverlay();
        return true;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (key === "arrowdown") {
          event.preventDefault();
          event.stopPropagation();
          if (!commandItems.length) return true;
          const next = commandActiveIndex === -1 ? 0 : (commandActiveIndex + 1) % Math.max(1, commandItems.length);
          setCommandSelection(next);
          return true;
        }
        if (key === "arrowup") {
          event.preventDefault();
          event.stopPropagation();
          if (!commandItems.length) return true;
          const next = commandActiveIndex === -1 ? commandItems.length - 1 : (commandActiveIndex - 1 + commandItems.length) % Math.max(1, commandItems.length);
          setCommandSelection(next);
          return true;
        }
        if (key === "enter") {
          event.preventDefault();
          event.stopPropagation();
          if (commandActiveIndex >= 0 && commandFiltered[commandActiveIndex]) {
            const cmd = commandFiltered[commandActiveIndex];
            closeCommandOverlay();
            try {
              cmd.action();
            } catch (e) {
              console.debug("Zero command action error:", e);
            }
          }
          return true;
        }
      }
      return false;
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
        primeSnoozeDropdown();
        modal.innerHTML = `
        <div class="oz-snooze-header">
          <div class="oz-snooze-title">
            Unsnooze
            <button
              type="button"
              class="oz-snooze-info"
              aria-label="Unsnooze keyboard help"
              title="Use j / k to navigate and Enter to select \xB7 Esc to close"
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
        primeSnoozeDropdown();
        modal.innerHTML = `
        <div class="oz-snooze-header">
          <div class="oz-snooze-title">
            Snooze
            <button
              type="button"
              class="oz-snooze-info"
              aria-label="Snooze keyboard help"
              title="Use j / k to navigate and Enter to select \xB7 Esc to close"
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
            <span class="oz-snooze-label">Choose a date\u2026</span>
          </button>
        </div>
      `;
      }
      backdrop.appendChild(modal);
      snoozeButtons = Array.from(modal.querySelectorAll("[data-oz-snooze]"));
      document.documentElement.appendChild(backdrop);
      snoozeOverlay = backdrop;
      hydrateSnoozeDescriptions(modal);
      setSnoozeSelection(0);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          closeSnoozeOverlay();
        }
      });
      modal.addEventListener("click", (e) => {
        const target = (
          /** @type {HTMLElement} */
          e.target
        );
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
    function getMessageListContainer() {
      return document.querySelector('[role="grid"]') || document.querySelector('[role="listbox"]') || document.querySelector('[role="treegrid"]');
    }
    function getMessageRows() {
      const container = getMessageListContainer();
      if (!container) return [];
      return Array.from(container.querySelectorAll('[role="row"], [role="option"]'));
    }
    function getInboxMessageCount() {
      const rows = getMessageRows();
      if (!rows.length) return 0;
      let count = 0;
      for (const row of rows) {
        const el = (
          /** @type {HTMLElement} */
          row
        );
        if (!el) continue;
        const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
        const text = (el.textContent || "").trim().toLowerCase();
        const isEmptyPlaceholder = ariaLabel.includes("no items") || ariaLabel.includes("no conversations") || ariaLabel.includes("no messages") || ariaLabel.includes("you're all caught up") || text.includes("no items") || text.includes("no conversations") || text.includes("no messages") || text.includes("you're all caught up");
        if (!isEmptyPlaceholder) {
          count += 1;
        }
      }
      return count;
    }
    function getCurrentEmailRoot() {
      return document.getElementById("ConversationReadingPaneContainer") || document.querySelector('[data-app-section="ConversationContainer"]') || document;
    }
    function findUnsubscribeLinkInCurrentEmail() {
      try {
        const root = getCurrentEmailRoot();
        if (!root) return null;
        let bestMatch = null;
        const anchors = Array.from(root.querySelectorAll("a[href]"));
        const lowerIncludes = (value, needle) => typeof value === "string" && value.toLowerCase().includes(needle);
        for (const node of anchors) {
          const el = (
            /** @type {HTMLElement} */
            node
          );
          if (!el) continue;
          const text = (el.innerText || el.textContent || "").trim();
          const href = el.getAttribute("href") || "";
          const aria = el.getAttribute("aria-label") || "";
          const isUnsub = lowerIncludes(text, "unsubscribe") || lowerIncludes(href, "unsubscribe") || lowerIncludes(aria, "unsubscribe");
          if (isUnsub) {
            bestMatch = el;
            break;
          }
        }
        return bestMatch;
      } catch (e) {
      }
      return null;
    }
    function clickUnsubscribeLink() {
      const link = findUnsubscribeLinkInCurrentEmail();
      if (!link) {
        console.debug("Zero: No unsubscribe link found in current email.");
        return false;
      }
      try {
        link.click();
        return true;
      } catch (e) {
        console.debug("Zero: Failed to click unsubscribe link:", e);
        return false;
      }
    }
    function getCurrentEmailText() {
      try {
        const root = getCurrentEmailRoot() || document;
        const chunks = [];
        const seen = /* @__PURE__ */ new Set();
        const bodySelectors = [
          'div[role="document"]',
          '[data-message-id] [role="document"]',
          'div[aria-label="Message body"]',
          'div[aria-label="Message content"]'
        ];
        for (const selector of bodySelectors) {
          const nodes = Array.from(root.querySelectorAll(selector));
          if (!nodes.length) continue;
          for (const el of nodes) {
            if (!el) continue;
            const text = (el.innerText || el.textContent || "").trim();
            if (text && !seen.has(text)) {
              seen.add(text);
              chunks.push(text);
            }
          }
        }
        const previewNodes = Array.from(root.querySelectorAll("div._nzWz"));
        for (const el of previewNodes) {
          if (!el) continue;
          const text = (el.innerText || el.textContent || "").trim();
          if (text && !seen.has(text)) {
            seen.add(text);
            chunks.push(text);
          }
        }
        if (!chunks.length) {
          return "";
        }
        const full = chunks.join("\n\n---\n\n");
        const maxChars = 2e4;
        return full.length > maxChars ? full.slice(full.length - maxChars) : full;
      } catch (e) {
      }
      return "";
    }
    function getCurrentRowIndex(rows) {
      if (!rows || !rows.length) return -1;
      const active = document.activeElement;
      let fallbackIndex = -1;
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row) continue;
        const el = (
          /** @type {HTMLElement} */
          row
        );
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
    function hasSelectedMessage() {
      const rows = getMessageRows();
      if (!rows.length) return false;
      return getCurrentRowIndex(rows) !== -1;
    }
    function startInboxZeroObserver() {
      try {
        if (inboxZeroObserver) {
          inboxZeroObserver.disconnect();
        }
        lastInboxCount = getInboxMessageCount();
        inboxZeroObserver = new MutationObserver(() => {
          try {
            const count = getInboxMessageCount();
            if (lastInboxCount === null) {
              lastInboxCount = count;
              return;
            }
            if (lastInboxCount > 0 && count === 0 && isInboxView()) {
              showInboxZeroFireworks();
            }
            lastInboxCount = count;
          } catch (e) {
          }
        });
        const target = document.body || document.documentElement;
        if (!target) {
          return;
        }
        inboxZeroObserver.observe(target, {
          childList: true,
          subtree: true
        });
      } catch (e) {
      }
    }
    function focusMessageRow(row) {
      const targetRow = (
        /** @type {HTMLElement} */
        row
      );
      if (!targetRow) return;
      targetRow.click();
      if (typeof targetRow.focus === "function") {
        targetRow.focus();
      }
      if (typeof targetRow.scrollIntoView === "function") {
        targetRow.scrollIntoView({ block: "nearest" });
      }
    }
    function getRowKey(row) {
      const el = (
        /** @type {HTMLElement} */
        row
      );
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
    function buildRowKeySet(rows) {
      const result = /* @__PURE__ */ new Set();
      for (const row of rows) {
        const key = getRowKey(row);
        if (key) {
          result.add(key);
        }
      }
      return result;
    }
    function refocusRestoredMessage(previousKeys, previousCount) {
      const container = getMessageListContainer() || document.body;
      if (!container) return;
      const prevCount = typeof previousCount === "number" ? previousCount : 0;
      const findRestoredRow = () => {
        const rows = getMessageRows();
        for (const row of rows) {
          const key = getRowKey(row);
          if (key && !previousKeys.has(key)) {
            return (
              /** @type {HTMLElement} */
              row
            );
          }
        }
        if (rows.length > prevCount && rows[0]) {
          return (
            /** @type {HTMLElement} */
            rows[0]
          );
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
      const timeoutId = setTimeout(() => observer.disconnect(), 3e3);
    }
    function sendShiftArrow(direction) {
      const key = direction === "down" ? "ArrowDown" : "ArrowUp";
      const keyCode = direction === "down" ? 40 : 38;
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
      const targetRow = (
        /** @type {HTMLElement} */
        rows[index]
      );
      if (!targetRow) return;
      targetRow.click();
      if (typeof targetRow.focus === "function") {
        targetRow.focus();
      }
      if (typeof targetRow.scrollIntoView === "function") {
        targetRow.scrollIntoView({ block: "nearest" });
      }
    }
    function getNavItems() {
      const selectors = [
        // Folder tree / left navigation items
        'nav [role="treeitem"]',
        'nav [role="menuitem"]',
        '[role="tree"] [role="treeitem"]',
        '[role="menubar"] [role="menuitem"]',
        // Common Outlook-specific data attributes/classes (best effort)
        "[data-is-selected]",
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
        const el = (
          /** @type {HTMLElement} */
          items[i]
        );
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
      const target = (
        /** @type {HTMLElement} */
        items[index]
      );
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
      const target = (
        /** @type {HTMLElement} */
        items[index]
      );
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
      const target = (
        /** @type {HTMLElement} */
        items[index]
      );
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
      const targetRow = (
        /** @type {HTMLElement} */
        rows[index]
      );
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
    function onKeyDown(event) {
      try {
        if (!event.isTrusted) {
          return;
        }
        const key = (event.key || "").toLowerCase();
        const targetNode = (
          /** @type {Node | null} */
          event.target
        );
        if (commandOverlay) {
          if (handleCommandOverlayKeydown(event)) {
            return;
          }
          if (targetNode && commandOverlay.contains(targetNode)) {
            event.stopPropagation();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (summaryOverlay && key === "escape") {
          event.preventDefault();
          event.stopPropagation();
          closeSummaryOverlay();
          return;
        }
        if (isEditableElement(targetNode)) {
          vimContext = "auto";
          return;
        }
        if (vimEnabled && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && (key === "j" || key === "k") && !snoozeOverlay) {
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
            if (key === "h" || key === "l") {
              event.preventDefault();
              event.stopPropagation();
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
        if (vimEnabled && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
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
        if (commandShortcut && shortcutMatches(event, commandShortcut)) {
          event.preventDefault();
          event.stopPropagation();
          if (commandOverlay) {
            closeCommandOverlay();
          } else {
            openCommandOverlay();
          }
          return;
        }
        if (undoShortcut && shortcutMatches(event, undoShortcut)) {
          event.preventDefault();
          event.stopPropagation();
          triggerUndo();
        }
      } catch (e) {
        console.debug("Outlook Keyboard Shortcuts content script error:", e);
      }
    }
    loadSettings();
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          startInboxZeroObserver();
        },
        { once: true }
      );
    } else {
      startInboxZeroObserver();
    }
    try {
      browserApi.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "sync") return;
        if (changes.undoShortcut && changes.undoShortcut.newValue) {
          undoShortcut = {
            ...DEFAULT_UNDO_SHORTCUT,
            ...changes.undoShortcut.newValue
          };
        }
        if (changes.commandShortcut && changes.commandShortcut.newValue) {
          commandShortcut = {
            ...DEFAULT_COMMAND_SHORTCUT,
            ...changes.commandShortcut.newValue
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
    }
    window.addEventListener("keydown", onKeyDown, true);
  })();
})();
