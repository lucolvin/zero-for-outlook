// LLM Summary overlay feature module
import { settings } from "../core/settings.js";
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

  if (!summaryOverlay) {
    const backdrop = document.createElement("div");
    backdrop.className =
      "oz-summary-backdrop " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");

    const modal = document.createElement("div");
    modal.className =
      "oz-summary-modal " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");

    modal.innerHTML = `
      <div class="oz-summary-header">
        <div class="oz-summary-title">
          <span>Summary</span>
          <span class="oz-summary-chip">Gemini</span>
        </div>
        <button type="button" class="oz-summary-close" aria-label="Close summary">Esc</button>
      </div>
      <div class="oz-summary-body"></div>
    `;

    backdrop.appendChild(modal);
    document.documentElement.appendChild(backdrop);

    summaryOverlay = backdrop;
    summaryContentEl = modal.querySelector(".oz-summary-body");

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop && !isLoading) {
        closeSummaryOverlay();
      }
    });

    const closeBtn = modal.querySelector(".oz-summary-close");
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

export function updateSummaryOverlayTheme() {
  if (!summaryOverlay) return;
  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;
  
  const backdrop = summaryOverlay;
  const modal = backdrop.querySelector(".oz-summary-modal");
  if (!modal) return;

  backdrop.className =
    "oz-summary-backdrop " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
  modal.className =
    "oz-summary-modal " + (darkModeEnabled ? "oz-summary-dark" : "oz-summary-light");
}

// Helper for keyboard handler
export function isSummaryOverlayOpen() {
  return summaryOverlay !== null;
}

