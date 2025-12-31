import { browserApi } from "../core/browserApi.js";
import { settings } from "../core/settings.js";
import { findOutlookSettingsButton } from "./navigation.js";
import { waitForElement, waitForElementByText } from "../core/dom.js";
import {
  updateCommandOverlayTheme,
  rebuildCommandList,
  refreshCommandList,
  isCommandOverlayOpen
} from "./commandBar.js";
import {
  updateSnoozeOverlayTheme,
  isSnoozeOverlayOpen
} from "./snooze.js";
import {
  updateSummaryOverlayTheme,
  isSummaryOverlayOpen
} from "./summary.js";

// State
let darkModeEnabled = true;

export function getDarkModeEnabled() {
  return darkModeEnabled;
}

export function setDarkModeEnabled(value) {
  darkModeEnabled = value;
}

function closeSettingsPanel() {
  try {
    // Try various methods to close the settings panel
    const closeSelectors = [
      'button[aria-label*="Close"]',
      '.ms-Panel-closeButton',
      'button[title*="Close"]',
    ];
    
    for (const selector of closeSelectors) {
      const closeBtn = document.querySelector(selector);
      if (closeBtn) {
        /** @type {HTMLElement} */ (closeBtn).click();
        return;
      }
    }
    
    // Fallback: Press Escape key
    const escEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.activeElement?.dispatchEvent(escEvent);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("Zero: Could not close settings panel:", e);
  }
}

async function navigateToAppearanceAndToggle(targetMode, settingsWasOpen) {
  try {
    // Step 2: Wait for and click the "General" tab
    const generalTab = await waitForElement('button[role="tab"][value="general"]');
    if (generalTab) {
      /** @type {HTMLElement} */ (generalTab).click();
      // Small delay to let the click register
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }

    // Step 3: Wait for and click the "Appearance" tab
    const appearanceTab = await waitForElement('button[role="tab"][value="appAppearance"]');
    if (appearanceTab) {
      /** @type {HTMLElement} */ (appearanceTab).click();
      // Small delay to let the appearance options load
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }

    // Step 4: Wait for the radio button to appear, then click it
    const radioSelector = `input[id^="ChoiceGroup"][id$="-${targetMode}"]`;
    const radio = await waitForElement(radioSelector);
    if (radio) {
      /** @type {HTMLElement} */ (radio).click();
      // Small delay to let the selection register
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }

    // Step 5: Wait for and click the Save button
    const saveBtn = await waitForElementByText('button[type="button"]', 'Save');
    if (saveBtn) {
      /** @type {HTMLElement} */ (saveBtn).click();
      // Small delay to let save complete
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    
    // Step 6: Close settings panel if we opened it
    if (!settingsWasOpen) {
      closeSettingsPanel();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("Zero: Could not navigate to appearance:", e);
  }
}

function toggleOutlookAppearance(targetMode) {
  // targetMode: "light" or "dark"
  // Opens settings, navigates to Appearance tab, selects theme, and closes
  try {
    let settingsWasOpen = false;
    
    // Check if settings panel is already open
    const existingPanel = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (existingPanel) {
      settingsWasOpen = true;
    }

    // Step 1: Open settings if not already open
    if (!settingsWasOpen) {
      const settingsButton = findOutlookSettingsButton();
      if (!settingsButton) {
        return;
      }
      /** @type {HTMLElement} */ (settingsButton).click();
      // Wait for settings panel to open (check for dialog element)
      waitForElement('[role="dialog"][aria-modal="true"]').then(() => {
        navigateToAppearanceAndToggle(targetMode, settingsWasOpen);
      });
    } else {
      navigateToAppearanceAndToggle(targetMode, settingsWasOpen);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("Zero: Could not toggle Outlook appearance:", e);
  }
}

export function toggleDarkMode() {
  try {
    const newValue = !darkModeEnabled;
    browserApi.storage.sync.set({ darkModeEnabled: newValue }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        // eslint-disable-next-line no-console
        console.debug("Zero: Could not toggle dark mode setting:", browserApi.runtime.lastError);
        return;
      }
      darkModeEnabled = newValue;
      // Update SettingsManager state immediately so command bar reads correct state
      settings.darkModeEnabled = newValue;
      
      // Also toggle Outlook's dark/light mode
      toggleOutlookAppearance(newValue ? "dark" : "light");
      
      updateCommandOverlayTheme();
      // Re-render command list to update the toggle command's display text
      if (isCommandOverlayOpen()) {
        refreshCommandList();
      }
      // Also update snooze and summary overlays if they're open
      if (isSnoozeOverlayOpen()) {
        updateSnoozeOverlayTheme();
      }
      if (isSummaryOverlayOpen()) {
        updateSummaryOverlayTheme();
      }
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("Zero: Could not toggle dark mode setting:", e);
  }
}

