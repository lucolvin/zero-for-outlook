// @ts-nocheck
// Zen reading: maximize the conversation reading surface with top/bottom dismiss bands.
// Outlook’s own shortcuts (e.g. archive) still reach the page because the center stays unmasked.

const TOP_ID = "oz-fs-reading-top";
const BOTTOM_ID = "oz-fs-reading-bottom";
const STYLE_ID = "oz-fs-reading-style";

let active = false;
const disposers = [];

function getReadingPane() {
  return (
    document.getElementById("ConversationReadingPaneContainer") ||
    document.querySelector('[data-app-section="ConversationContainer"]')
  );
}

export function isFullscreenReadingActive() {
  return active;
}

/** When zen reading is on and focus is inside the message body, let Outlook handle j/k/etc. */
export function shouldVimDeferToOutlook() {
  if (!active) return false;
  const pane = getReadingPane();
  const ae = document.activeElement;
  return !!(pane && ae && pane.contains(ae));
}

function removeEl(id) {
  const el = document.getElementById(id);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

export function exitFullscreenReading() {
  if (!active) return;
  active = false;
  document.documentElement.classList.remove("oz-fs-reading");
  while (disposers.length) {
    const fn = disposers.pop();
    try {
      fn();
    } catch {
      // ignore
    }
  }
  removeEl(STYLE_ID);
  removeEl(TOP_ID);
  removeEl(BOTTOM_ID);
}

function onWheelTop(e) {
  if (e.deltaY < -18) {
    exitFullscreenReading();
  }
}

function onWheelBottom(e) {
  if (e.deltaY > 18) {
    exitFullscreenReading();
  }
}

export function enterFullscreenReading() {
  if (active) return;
  const pane = getReadingPane();
  if (!pane) return;

  active = true;
  document.documentElement.classList.add("oz-fs-reading");

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html.oz-fs-reading #ConversationReadingPaneContainer,
    html.oz-fs-reading [data-app-section="ConversationContainer"] {
      position: fixed !important;
      left: 0 !important;
      right: 0 !important;
      top: 52px !important;
      bottom: 52px !important;
      z-index: 2147483000 !important;
      max-width: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: auto !important;
    }
  `;
  document.documentElement.appendChild(style);

  const bandStyle =
    "position:fixed;left:0;right:0;z-index:2147483002;display:flex;align-items:center;justify-content:center;" +
    "font:500 12px/1.3 system-ui,-apple-system,sans-serif;pointer-events:auto;" +
    "background:linear-gradient(180deg,rgba(15,23,42,0.55),transparent);color:#f8fafc;padding:10px 16px;";

  const top = document.createElement("div");
  top.id = TOP_ID;
  top.setAttribute("role", "presentation");
  top.style.cssText = bandStyle + "top:0;height:52px;";
  top.textContent = "Scroll up or Esc to exit reading focus";
  top.addEventListener("wheel", onWheelTop, { passive: true });
  document.documentElement.appendChild(top);

  const bottom = document.createElement("div");
  bottom.id = BOTTOM_ID;
  bottom.setAttribute("role", "presentation");
  bottom.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;height:52px;z-index:2147483002;display:flex;align-items:center;justify-content:center;" +
    "font:500 12px/1.3 system-ui,-apple-system,sans-serif;pointer-events:auto;" +
    "background:linear-gradient(0deg,rgba(15,23,42,0.55),transparent);color:#f8fafc;padding:10px 16px;";
  bottom.textContent = "Scroll down or Esc to exit";
  bottom.addEventListener("wheel", onWheelBottom, { passive: true });
  document.documentElement.appendChild(bottom);

  const onKey = (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      exitFullscreenReading();
    }
  };
  document.addEventListener("keydown", onKey, true);
  disposers.push(() => document.removeEventListener("keydown", onKey, true));
}

export function toggleFullscreenReading() {
  if (active) {
    exitFullscreenReading();
  } else {
    enterFullscreenReading();
  }
}
