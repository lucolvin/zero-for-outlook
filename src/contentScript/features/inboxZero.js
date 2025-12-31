import { getInboxMessageCount } from "../core/messageList.js";

// State
let inboxZeroOverlay = null;
let inboxZeroObserver = null;
let lastInboxCount = null;

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

export function hideInboxZeroFireworks() {
  if (inboxZeroOverlay && inboxZeroOverlay.parentNode) {
    inboxZeroOverlay.parentNode.removeChild(inboxZeroOverlay);
  }
  inboxZeroOverlay = null;
}

export function showInboxZeroFireworks() {
  try {
    ensureFireworksStyles();
    hideInboxZeroFireworks();

    const backdrop = document.createElement("div");
    backdrop.className = "oz-fireworks-backdrop";

    const message = document.createElement("div");
    message.className = "oz-fireworks-message";
    message.textContent = "Inbox zero – nicely done!";
    backdrop.appendChild(message);

    const COLORS = ["#facc15", "#38bdf8", "#34d399", "#f97316", "#e879f9"];

    for (let i = 0; i < 40; i += 1) {
      const fw = document.createElement("div");
      fw.className = "oz-firework";
      const fromLeftSide = i % 2 === 0;
      const baseX = fromLeftSide ? 5 : 95;
      const spreadX = 40; // allow bursts to arc toward center
      const x = fromLeftSide
        ? baseX + Math.random() * spreadX
        : baseX - Math.random() * spreadX;
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
        // ignore
      }
    }, 6500);
  } catch (e) {
    // best-effort only
  }
}

export function startInboxZeroObserver() {
  try {
    if (inboxZeroObserver) {
      inboxZeroObserver.disconnect();
    }

    // Establish an initial baseline for the current folder.
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
  } catch (e) {
    // best-effort only
  }
}

