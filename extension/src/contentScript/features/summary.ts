// @ts-nocheck
// LLM Summary overlay feature module
import { settings } from "../core/settings.ts";
import summaryStyles from "../styles/summary.css?raw";

// State
let summaryOverlay = null;
let summaryContentEl = null;

// Styles
function ensureSummaryStyles() {
  if (document.getElementById("oz-summary-style")) return;
  const style = document.createElement("style");
  style.id = "oz-summary-style";
  style.textContent = summaryStyles;
  document.documentElement.appendChild(style);
}

function applyAccentColor(element, color) {
  if (!element || !color) return;
  
  const hoverColors = {
    '#6366f1': '#4f46e5',
    '#ec4899': '#db2777',
    '#f97316': '#ea580c',
    '#eab308': '#ca8a04',
    '#10b981': '#059669',
    '#14b8a6': '#0d9488',
    '#3b82f6': '#2563eb'
  };
  
  const hoverColor = hoverColors[color] || color;
  const mutedColor = `${color}33`;
  
  element.style.setProperty('--oz-accent', color);
  element.style.setProperty('--oz-accent-hover', hoverColor);
  element.style.setProperty('--oz-accent-muted', mutedColor);
}

// Overlay management
export function closeSummaryOverlay() {
  if (summaryOverlay && summaryOverlay.parentNode) {
    summaryOverlay.parentNode.removeChild(summaryOverlay);
  }
  summaryOverlay = null;
  summaryContentEl = null;
}

export function openSummaryOverlay(options) {
  const title = (options && options.title) || "Email summary";
  const body = (options && options.body) || "";
  const isError = !!(options && options.isError);
  const isLoading = !!(options && options.isLoading);

  ensureSummaryStyles();

  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;
  const oledModeEnabled = !!state.oledModeEnabled;
  const accentColor = state.accentColor || '#6366f1';
  const popupOpacity = (state.popupOpacity || 95) / 100;
  const backdropBlurEnabled = state.backdropBlurEnabled !== false;

  if (!summaryOverlay) {
    const backdrop = document.createElement("div");
    backdrop.className =
      "oz-summary-backdrop " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
    backdrop.style.background = "transparent";
    backdrop.style.backdropFilter = backdropBlurEnabled ? "blur(14px) saturate(130%)" : "none";
    backdrop.style.webkitBackdropFilter = backdropBlurEnabled ? "blur(14px) saturate(130%)" : "none";

    const modal = document.createElement("div");
    modal.className =
      "oz-summary-modal " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
    modal.style.opacity = popupOpacity;
    if (darkModeEnabled && oledModeEnabled) {
      modal.style.backgroundColor = "#000000";
    }
    
    applyAccentColor(modal, accentColor);

    const header = document.createElement("div");
    header.className = "oz-summary-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "oz-summary-title";

    const titleText = document.createElement("span");
    titleText.textContent = "Summary";

    const chip = document.createElement("span");
    chip.className = "oz-summary-chip";
    chip.textContent = "Gemini";

    titleWrap.appendChild(titleText);
    titleWrap.appendChild(chip);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "oz-summary-close";
    closeBtn.setAttribute("aria-label", "Close summary");
    closeBtn.textContent = "Esc";

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const bodyEl = document.createElement("div");
    bodyEl.className = "oz-summary-body";

    modal.appendChild(header);
    modal.appendChild(bodyEl);

    backdrop.appendChild(modal);
    document.documentElement.appendChild(backdrop);

    summaryOverlay = backdrop;
    summaryContentEl = modal.querySelector(".oz-summary-body");

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop && !isLoading) {
        closeSummaryOverlay();
      }
    });

    closeBtn.addEventListener("click", () => {
      if (!isLoading) {
        closeSummaryOverlay();
      }
    });
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

export function updateSummaryOverlayTheme() {
  if (!summaryOverlay) return;
  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;
  const oledModeEnabled = !!state.oledModeEnabled;
  const accentColor = state.accentColor || "#6366f1";
  const popupOpacity = (state.popupOpacity || 95) / 100;
  const backdropBlurEnabled = state.backdropBlurEnabled !== false;

  const backdrop = summaryOverlay;
  const modal = backdrop.querySelector(".oz-summary-modal");
  if (!modal) return;

  backdrop.className =
    "oz-summary-backdrop " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
  backdrop.style.background = "transparent";
  backdrop.style.backdropFilter = backdropBlurEnabled ? "blur(14px) saturate(130%)" : "none";
  backdrop.style.webkitBackdropFilter = backdropBlurEnabled ? "blur(14px) saturate(130%)" : "none";
  modal.className =
    "oz-summary-modal " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
  modal.style.opacity = popupOpacity;
  modal.style.backgroundColor = darkModeEnabled && oledModeEnabled ? "#000000" : "";
  
  applyAccentColor(modal, accentColor);
}

// Helper for keyboard handler
export function isSummaryOverlayOpen() {
  return summaryOverlay !== null;
}

