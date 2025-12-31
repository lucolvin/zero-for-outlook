// Initialization module that wires all features together
import { browserApi } from "./browserApi.js";
import {
  DEFAULT_UNDO_SHORTCUT,
  DEFAULT_COMMAND_SHORTCUT,
  settings
} from "./settings.js";
import {
  startInboxZeroObserver,
  stopInboxZeroObserver
} from "../features/inboxZero.js";
import {
  applyOptionsBarVisibility,
  startOptionsBarObserver,
  getOptionsBarHidden,
  setOptionsBarHidden
} from "../features/optionsBar.js";
import {
  getDarkModeEnabled,
  setDarkModeEnabled
} from "../features/darkMode.js";
import {
  rebuildCommandList,
  refreshCommandList,
  setCommandBarDependencies,
  updateCommandOverlayTheme,
  isCommandOverlayOpen
} from "../features/commandBar.js";
import {
  updateSnoozeOverlayTheme,
  isSnoozeOverlayOpen
} from "../features/snooze.js";
import {
  updateSummaryOverlayTheme,
  isSummaryOverlayOpen
} from "../features/summary.js";
import {
  openSummaryOverlay
} from "../features/summary.js";
import {
  toggleDarkMode
} from "../features/darkMode.js";
import {
  toggleOptionsBar
} from "../features/optionsBar.js";
import {
  startElementPicker,
  executeCustomShortcut
} from "../features/elementPicker.js";
import {
  openSnoozeAndApplyPreset
} from "../features/snooze.js";
import { createKeyboardHandler } from "./keyboardHandler.js";

// State
let undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
let commandShortcut = { ...DEFAULT_COMMAND_SHORTCUT };
let vimEnabled = true;
let inboxZeroEnabled = false;
let customShortcuts = [];
let aiTitleEditingEnabled = true;

export function loadSettings() {
  return new Promise((resolve) => {
    try {
      browserApi.storage.sync.get(
        {
          undoShortcut: DEFAULT_UNDO_SHORTCUT,
          commandShortcut: DEFAULT_COMMAND_SHORTCUT,
          vimEnabled: true,
          darkModeEnabled: true,
          inboxZeroEnabled: false,
          optionsBarHidden: false,
          customShortcuts: [],
          aiTitleEditingEnabled: true
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            resolve();
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
              setDarkModeEnabled(items.darkModeEnabled);
            }
            if (typeof items.inboxZeroEnabled === "boolean") {
              inboxZeroEnabled = items.inboxZeroEnabled;
            }
            if (typeof items.optionsBarHidden === "boolean") {
              setOptionsBarHidden(items.optionsBarHidden);
            }
            if (typeof items.aiTitleEditingEnabled === "boolean") {
              aiTitleEditingEnabled = items.aiTitleEditingEnabled;
            }
            if (Array.isArray(items.customShortcuts)) {
              customShortcuts = items.customShortcuts;
            } else {
              customShortcuts = [];
            }
          } else {
            customShortcuts = [];
          }
          
          // Start or stop the observer based on the setting
          if (inboxZeroEnabled) {
            startInboxZeroObserver();
          } else {
            stopInboxZeroObserver();
          }
          // Apply Outlook options visibility
          applyOptionsBarVisibility();
          
          resolve();
        }
      );
    } catch (e) {
      resolve();
    }
  });
}

export function initialize() {
  // Load settings (both the imperative initialization values and the shared SettingsManager
  // that the command bar reads from).
  Promise.all([loadSettings(), settings.load()]).then(() => {
    // Keep SettingsManager in sync for modules that read from it (e.g., command bar)
    settings.watch();

    // Wire up command palette dependencies
    setCommandBarDependencies({
      openSummaryOverlay,
      toggleDarkMode,
      toggleOptionsBar,
      startInboxZeroObserver,
      startElementPicker,
      executeCustomShortcut
    });

    // Build initial command list
    rebuildCommandList();

    // Set up keyboard handler
    let currentHandler = null;
    function updateKeyboardHandler() {
      if (currentHandler) {
        window.removeEventListener("keydown", currentHandler, true);
      }
      currentHandler = createKeyboardHandler({
        undoShortcut,
        commandShortcut,
        vimEnabled,
        customShortcuts
      });
      window.addEventListener("keydown", currentHandler, true);
    }
    updateKeyboardHandler();

    // Wait until the message list is present, then watch it for inbox-zero transitions.
    // Only start if enabled (will be started by loadSettings if enabled)
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          if (inboxZeroEnabled) {
            startInboxZeroObserver();
          }
          startOptionsBarObserver();
        },
        { once: true }
      );
    } else {
      if (inboxZeroEnabled) {
        startInboxZeroObserver();
      }
      startOptionsBarObserver();
    }

    // Listen for settings changes from the options page
    try {
      browserApi.storage.onChanged.addListener((changes) => {
        let handlerNeedsUpdate = false;
        if (changes.undoShortcut && changes.undoShortcut.newValue) {
          undoShortcut = {
            ...DEFAULT_UNDO_SHORTCUT,
            ...changes.undoShortcut.newValue
          };
          handlerNeedsUpdate = true;
        }
        if (changes.commandShortcut && changes.commandShortcut.newValue) {
          commandShortcut = {
            ...DEFAULT_COMMAND_SHORTCUT,
            ...changes.commandShortcut.newValue
          };
          handlerNeedsUpdate = true;
        }
        if (changes.vimEnabled && typeof changes.vimEnabled.newValue === "boolean") {
          vimEnabled = changes.vimEnabled.newValue;
          handlerNeedsUpdate = true;
        }
        if (changes.customShortcuts && Array.isArray(changes.customShortcuts.newValue)) {
          customShortcuts = changes.customShortcuts.newValue;
          handlerNeedsUpdate = true;
          rebuildCommandList();
        }
        if (handlerNeedsUpdate) {
          updateKeyboardHandler();
        }
        if (changes.darkModeEnabled && typeof changes.darkModeEnabled.newValue === "boolean") {
          setDarkModeEnabled(changes.darkModeEnabled.newValue);
          applyOptionsBarVisibility();
          if (isCommandOverlayOpen()) {
            updateCommandOverlayTheme();
            refreshCommandList();
          }
          if (isSnoozeOverlayOpen()) {
            updateSnoozeOverlayTheme();
          }
          if (isSummaryOverlayOpen()) {
            updateSummaryOverlayTheme();
          }
        }
        if (changes.optionsBarHidden && typeof changes.optionsBarHidden.newValue === "boolean") {
          setOptionsBarHidden(changes.optionsBarHidden.newValue);
          if (isCommandOverlayOpen()) {
            refreshCommandList();
          }
        }
        if (changes.aiTitleEditingEnabled && typeof changes.aiTitleEditingEnabled.newValue === "boolean") {
          aiTitleEditingEnabled = changes.aiTitleEditingEnabled.newValue;
        }
        if (changes.inboxZeroEnabled && typeof changes.inboxZeroEnabled.newValue === "boolean") {
          inboxZeroEnabled = changes.inboxZeroEnabled.newValue;
          if (inboxZeroEnabled) {
            startInboxZeroObserver();
          } else {
            stopInboxZeroObserver();
          }
          if (isCommandOverlayOpen()) {
            refreshCommandList();
          }
        }
      });
    } catch (e) {
      // Ignore if storage events are not available
    }

    // Listen for runtime messages
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
  });
}

