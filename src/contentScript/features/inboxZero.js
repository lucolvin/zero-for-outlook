import { browserApi } from "../core/browserApi.js";
import { settings } from "../core/settings.js";
import { getInboxMessageCount } from "../core/messageList.js";

// State
let inboxZeroOverlay = null;
let inboxZeroObserver = null;
let lastInboxCount = null;
let overlayDismissTimer = null;
let overlayKeydownHandler = null;
let zeroConfirmationTimer = null;
let isStreakOverlayInFlight = false;
let lastOverlayShownDateInMemory = null;

const INBOX_ZERO_STREAK_KEY = "inboxZeroStreak";
const DEFAULT_ACCENT_COLOR = "#6366f1";

// Helper function to check if we're in the inbox view
function isInboxView() {
  try {
    const url = window.location.href || "";
    if (!url) return false;

    // Common patterns:
    // - https://outlook.office.com/mail/inbox/
    // - https://outlook.office.com/mail/0/inbox
    // - https://outlook.office365.com/mail/inbox?view=...
    // - https://outlook.office365.com/mail/0/inbox?view=...
    const inboxPattern = /\/mail\/[^/]*\/inbox(?:[/?#]|$)/i;
    if (inboxPattern.test(url)) {
      return true;
    }

    // Fallback for older/alternate shapes that might omit the segment.
    if (
      url.toLowerCase().indexOf("/mail/inbox/") !== -1 ||
      url.toLowerCase().endsWith("/mail/inbox")
    ) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function getLocalDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayStamp() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateStamp(yesterday);
}

function loadInboxZeroStreakData() {
  return new Promise((resolve) => {
    try {
      browserApi.storage.sync.get(
        {
          [INBOX_ZERO_STREAK_KEY]: {
            days: 0,
            lastHitDate: null,
            lastOverlayDate: null
          }
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            resolve({
              days: 0,
              lastHitDate: null,
              lastOverlayDate: null
            });
            return;
          }

          const incoming = items && items[INBOX_ZERO_STREAK_KEY];
          const days =
            incoming && Number.isFinite(incoming.days) && incoming.days > 0
              ? Math.floor(incoming.days)
              : 0;
          const lastHitDate =
            incoming && typeof incoming.lastHitDate === "string"
              ? incoming.lastHitDate
              : null;
          const lastOverlayDate =
            incoming && typeof incoming.lastOverlayDate === "string"
              ? incoming.lastOverlayDate
              : null;

          resolve({ days, lastHitDate, lastOverlayDate });
        }
      );
    } catch (e) {
      resolve({
        days: 0,
        lastHitDate: null,
        lastOverlayDate: null
      });
    }
  });
}

function saveInboxZeroStreakData(nextData) {
  return new Promise((resolve) => {
    try {
      browserApi.storage.sync.set(
        {
          [INBOX_ZERO_STREAK_KEY]: nextData
        },
        () => {
          resolve();
        }
      );
    } catch (e) {
      resolve();
    }
  });
}

function ensureInboxZeroStyles() {
  if (document.getElementById("oz-inbox-zero-style")) return;
  const style = document.createElement("style");
  style.id = "oz-inbox-zero-style";
  style.textContent = `
.oz-inbox-zero-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 2147483646;
  background:
    radial-gradient(circle at top, var(--oz-inbox-zero-accent-strong, rgba(99, 102, 241, 0.22)), transparent 48%),
    radial-gradient(circle at bottom, var(--oz-inbox-zero-accent-soft, rgba(99, 102, 241, 0.14)), transparent 55%),
    rgba(2, 6, 23, 0.86);
  backdrop-filter: blur(3px);
  animation: oz-inbox-zero-fade-in 220ms ease-out;
}

.oz-inbox-zero-card {
  min-width: min(92vw, 520px);
  max-width: 92vw;
  border-radius: 24px;
  text-align: center;
  padding: 34px 24px 30px;
  border: 1px solid var(--oz-inbox-zero-border, rgba(99, 102, 241, 0.46));
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.78));
  box-shadow: 0 26px 72px rgba(2, 6, 23, 0.58);
  color: #f8fafc;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.oz-inbox-zero-title {
  font-size: 0.9rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 650;
  color: rgba(226, 232, 240, 0.82);
  margin-bottom: 14px;
}

.oz-inbox-zero-count-viewport {
  position: relative;
  height: 88px;
  overflow: hidden;
  margin-bottom: 10px;
}

.oz-inbox-zero-count-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.oz-inbox-zero-count {
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(3.4rem, 10vw, 4.5rem);
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--oz-inbox-zero-accent, #a5b4fc);
}

.oz-inbox-zero-count-track.animate {
  animation: oz-streak-shift-up 560ms cubic-bezier(0.24, 0.8, 0.26, 1) forwards;
}

.oz-inbox-zero-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.88);
}

.oz-inbox-zero-subcopy {
  margin-top: 7px;
  font-size: 0.84rem;
  color: rgba(148, 163, 184, 0.94);
}

@keyframes oz-streak-shift-up {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-88px);
  }
}

@keyframes oz-inbox-zero-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
`;
  document.documentElement.appendChild(style);
}

export function hideInboxZeroFireworks() {
  if (overlayDismissTimer) {
    window.clearTimeout(overlayDismissTimer);
    overlayDismissTimer = null;
  }
  if (overlayKeydownHandler) {
    document.removeEventListener("keydown", overlayKeydownHandler, true);
    overlayKeydownHandler = null;
  }
  if (inboxZeroOverlay && inboxZeroOverlay.parentNode) {
    inboxZeroOverlay.parentNode.removeChild(inboxZeroOverlay);
  }
  inboxZeroOverlay = null;
}

function clearZeroConfirmationTimer() {
  if (zeroConfirmationTimer) {
    window.clearTimeout(zeroConfirmationTimer);
    zeroConfirmationTimer = null;
  }
}

function normalizeHexColor(color) {
  if (typeof color !== "string") return DEFAULT_ACCENT_COLOR;
  const trimmed = color.trim();
  const shortHex = /^#([a-fA-F0-9]{3})$/;
  const longHex = /^#([a-fA-F0-9]{6})$/;

  if (longHex.test(trimmed)) return trimmed;
  const shortMatch = trimmed.match(shortHex);
  if (!shortMatch) return DEFAULT_ACCENT_COLOR;
  const [r, g, b] = shortMatch[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`;
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeHexColor(hex).replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccentColor(element, accentColor) {
  if (!element) return;
  const color = normalizeHexColor(accentColor);
  element.style.setProperty("--oz-inbox-zero-accent", color);
  element.style.setProperty("--oz-inbox-zero-accent-strong", hexToRgba(color, 0.22));
  element.style.setProperty("--oz-inbox-zero-accent-soft", hexToRgba(color, 0.14));
  element.style.setProperty("--oz-inbox-zero-border", hexToRgba(color, 0.45));
}

function animateCountShift(track, shouldAnimate) {
  if (!track || !shouldAnimate) return;
  // Trigger animation on next frame so styles are applied before we add the class.
  window.requestAnimationFrame(() => {
    track.classList.add("animate");
  });
}

export function showInboxZeroFireworks(previousDays, nextDays) {
  try {
    ensureInboxZeroStyles();
    hideInboxZeroFireworks();

    const safePreviousDays = Number.isFinite(previousDays) && previousDays > 0
      ? Math.floor(previousDays)
      : 0;
    const safeNextDays = Number.isFinite(nextDays) && nextDays > 0
      ? Math.floor(nextDays)
      : 1;
    const shouldAnimate = safePreviousDays > 0;

    const backdrop = document.createElement("div");
    backdrop.className = "oz-inbox-zero-backdrop";
    const state = settings.getState();
    applyAccentColor(backdrop, state.accentColor || DEFAULT_ACCENT_COLOR);
    backdrop.addEventListener("click", () => {
      hideInboxZeroFireworks();
    });

    const card = document.createElement("div");
    card.className = "oz-inbox-zero-card";

    const title = document.createElement("div");
    title.className = "oz-inbox-zero-title";
    title.textContent = "Inbox Zero Streak";
    card.appendChild(title);

    const viewport = document.createElement("div");
    viewport.className = "oz-inbox-zero-count-viewport";

    const track = document.createElement("div");
    track.className = "oz-inbox-zero-count-track";

    if (shouldAnimate) {
      const previousCount = document.createElement("div");
      previousCount.className = "oz-inbox-zero-count";
      previousCount.textContent = String(safePreviousDays);
      track.appendChild(previousCount);
    }

    const nextCount = document.createElement("div");
    nextCount.className = "oz-inbox-zero-count";
    nextCount.textContent = String(safeNextDays);
    track.appendChild(nextCount);

    viewport.appendChild(track);
    card.appendChild(viewport);

    const label = document.createElement("div");
    label.className = "oz-inbox-zero-label";
    label.textContent = `${safeNextDays} day streak`;
    card.appendChild(label);

    const subcopy = document.createElement("div");
    subcopy.className = "oz-inbox-zero-subcopy";
    subcopy.textContent = "Keep your inbox clean tomorrow to extend it.";
    card.appendChild(subcopy);

    backdrop.appendChild(card);

    document.documentElement.appendChild(backdrop);
    inboxZeroOverlay = backdrop;

    overlayKeydownHandler = (event) => {
      if (event && event.key === "Escape") {
        hideInboxZeroFireworks();
      }
    };
    document.addEventListener("keydown", overlayKeydownHandler, true);

    animateCountShift(track, shouldAnimate);

    overlayDismissTimer = window.setTimeout(() => {
      try {
        hideInboxZeroFireworks();
      } catch (e) {
        // ignore
      }
    }, 4500);
  } catch (e) {
    // best-effort only
  }
}

async function recordInboxZeroHitAndShowOverlay() {
  if (isStreakOverlayInFlight) {
    return;
  }
  isStreakOverlayInFlight = true;
  try {
    const currentData = await loadInboxZeroStreakData();
    const today = getLocalDateStamp();
    const yesterday = getYesterdayStamp();

    const previousDays = currentData.days || 0;
    let nextDays = 1;

    if (currentData.lastHitDate === today) {
      nextDays = previousDays > 0 ? previousDays : 1;
    } else if (currentData.lastHitDate === yesterday) {
      nextDays = Math.max(1, previousDays + 1);
    }

    const hasShownToday =
      currentData.lastOverlayDate === today || lastOverlayShownDateInMemory === today;
    const nextOverlayDate = hasShownToday ? currentData.lastOverlayDate : today;

    await saveInboxZeroStreakData({
      days: nextDays,
      lastHitDate: today,
      lastOverlayDate: nextOverlayDate
    });

    if (!hasShownToday) {
      lastOverlayShownDateInMemory = today;
      showInboxZeroFireworks(previousDays, nextDays);
    }
  } finally {
    isStreakOverlayInFlight = false;
  }
}

export function startInboxZeroObserver() {
  try {
    if (inboxZeroObserver) {
      inboxZeroObserver.disconnect();
    }

    // Establish an initial baseline for the current folder.
    lastInboxCount = null;
    clearZeroConfirmationTimer();

    inboxZeroObserver = new MutationObserver(() => {
      try {
        const inInbox = isInboxView();
        if (!inInbox) {
          // Ignore non-inbox areas and reset baseline while navigating.
          lastInboxCount = null;
          clearZeroConfirmationTimer();
          return;
        }

        const count = getInboxMessageCount();
        if (lastInboxCount === null) {
          lastInboxCount = count;
          return;
        }
        if (lastInboxCount > 0 && count === 0) {
          clearZeroConfirmationTimer();
          zeroConfirmationTimer = window.setTimeout(() => {
            try {
              zeroConfirmationTimer = null;
              if (!isInboxView()) return;
              if (getInboxMessageCount() !== 0) return;
              recordInboxZeroHitAndShowOverlay();
            } catch (e) {
              // ignore
            }
          }, 300);
        } else if (count > 0) {
          clearZeroConfirmationTimer();
        }
        lastInboxCount = count;
      } catch (e) {
        // ignore
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
    // best-effort only
  }
}

export function stopInboxZeroObserver() {
  try {
    if (inboxZeroObserver) {
      inboxZeroObserver.disconnect();
      inboxZeroObserver = null;
    }
    lastInboxCount = null;
    clearZeroConfirmationTimer();
  } catch (e) {
    // best-effort only
  }
}

