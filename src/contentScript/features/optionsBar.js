import { browserApi } from "../core/browserApi.js";
import { settings } from "../core/settings.js";
import { refreshCommandList, isCommandOverlayOpen } from "./commandBar.js";

// State
let optionsBarHidden = false;
let optionsBarObserver = null;

export function getOptionsBarHidden() {
  return optionsBarHidden;
}

export function setOptionsBarHidden(value) {
  optionsBarHidden = value;
}

export function applyOptionsBarVisibility() {
  try {
    // Hide/show the options bar elements
    const elements = document.querySelectorAll(".fabqree");
    elements.forEach((el) => {
      if (optionsBarHidden) {
        /** @type {HTMLElement} */ (el).style.display = "none";
      } else {
        /** @type {HTMLElement} */ (el).style.display = "";
      }
    });
    // Hide/show the Outlook header
    const outlookHeader = document.getElementById("O365_NavHeader");
    if (outlookHeader) {
      if (optionsBarHidden) {
        /** @type {HTMLElement} */ (outlookHeader).style.display = "none";
      } else {
        /** @type {HTMLElement} */ (outlookHeader).style.display = "";
      }
    }
    // Hide/show the Outlook header container
    const outlookHeaderContainer = document.getElementById("o365header");
    if (outlookHeaderContainer) {
      if (optionsBarHidden) {
        /** @type {HTMLElement} */ (outlookHeaderContainer).style.height = "0px";
      } else {
        /** @type {HTMLElement} */ (outlookHeaderContainer).style.height = "";
      }
    }
    // Hide/show the left rail app bar navigation
    const leftRailAppBar = document.querySelector('[role="navigation"][aria-label="left-rail-appbar"]');
    if (leftRailAppBar) {
      // Find the parent container that wraps the navigation
      const parentContainer = leftRailAppBar.closest('div[data-tabster]');
      if (parentContainer) {
        if (optionsBarHidden) {
          /** @type {HTMLElement} */ (parentContainer).style.display = "none";
        } else {
          /** @type {HTMLElement} */ (parentContainer).style.display = "";
        }
      }
    }
  } catch (e) {
    // Best-effort only
  }
}

export function toggleOptionsBar() {
  try {
    const newValue = !optionsBarHidden;
    browserApi.storage.sync.set({ optionsBarHidden: newValue }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        // eslint-disable-next-line no-console
        console.debug("Zero: Could not toggle Outlook options setting:", browserApi.runtime.lastError);
        return;
      }
      optionsBarHidden = newValue;
      // Update SettingsManager state immediately so command bar reads correct state
      settings.optionsBarHidden = newValue;
      applyOptionsBarVisibility();
      // Re-render command list to update the toggle command's display text
      if (isCommandOverlayOpen()) {
        refreshCommandList();
      }
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("Zero: Could not toggle Outlook options setting:", e);
  }
}

export function startOptionsBarObserver() {
  try {
    if (optionsBarObserver) {
      optionsBarObserver.disconnect();
    }
    optionsBarObserver = new MutationObserver(() => {
      applyOptionsBarVisibility();
    });
    const target = document.body || document.documentElement;
    if (target) {
      optionsBarObserver.observe(target, {
        childList: true,
        subtree: true
      });
    }
  } catch (e) {
    // Best-effort only
  }
}

