// @ts-nocheck
// Initialization module that wires all features together
import { browserApi } from "./browserApi.ts";
import {
  DEFAULT_UNDO_SHORTCUT,
  DEFAULT_COMMAND_SHORTCUT,
  DEFAULT_BLOCKED_CONTENT_SHORTCUT,
  DEFAULT_SNIPPETS_PAGE_SHORTCUT,
  settings
} from "./settings.ts";
import {
  startInboxZeroObserver,
  stopInboxZeroObserver
} from "../features/inboxZero.ts";
import {
  applyOptionsBarVisibility,
  startOptionsBarObserver,
  getOptionsBarHidden,
  setOptionsBarHidden
} from "../features/optionsBar.ts";
import {
  getDarkModeEnabled,
  setDarkModeEnabled
} from "../features/darkMode.ts";
import { setArchivePopupEnabled } from "../features/archivePopup.ts";
import { setArchiveListMotionReduced } from "../features/archiveListMotion.ts";
import {
  loadSnippetsFromStorage,
  setSnippetsChangeCallback,
  watchSnippetStorage
} from "../features/snippets.ts";
import { startComposeFocusTracking } from "../features/snippetInsert.ts";
import { startSnippetInlinePicker } from "../features/snippetInlinePicker.ts";
import { startSnippetYourPlaceholderSendGuard } from "../features/snippetYourPlaceholderGuard.ts";
import { startAchievementToastObserver } from "../features/achievements.ts";
import {
  rebuildCommandList,
  refreshCommandList,
  setCommandBarDependencies,
  updateCommandOverlayTheme,
  isCommandOverlayOpen
} from "../features/commandBar.ts";
import {
  updateSnoozeOverlayTheme,
  isSnoozeOverlayOpen
} from "../features/snooze.ts";
import {
  updateSummaryOverlayTheme,
  isSummaryOverlayOpen
} from "../features/summary.ts";
import {
  openSummaryOverlay
} from "../features/summary.ts";
import {
  toggleDarkMode
} from "../features/darkMode.ts";
import {
  toggleOptionsBar
} from "../features/optionsBar.ts";
import {
  startElementPicker,
  executeCustomShortcut
} from "../features/elementPicker.ts";
import {
  openSnoozeAndApplyPreset
} from "../features/snooze.ts";
import { createKeyboardHandler } from "./keyboardHandler.ts";

// State
let undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
let commandShortcut = { ...DEFAULT_COMMAND_SHORTCUT };
let blockedContentShortcut = { ...DEFAULT_BLOCKED_CONTENT_SHORTCUT };
let snippetsPageShortcut = { ...DEFAULT_SNIPPETS_PAGE_SHORTCUT };
let vimEnabled = true;
let vimSmoothNavigationEnabled = true;
let inboxZeroEnabled = true;
let customShortcuts = [];
let aiTitleEditingEnabled = true;

export function loadSettings() {
  return new Promise((resolve) => {
    try {
      browserApi.storage.sync.get(
        {
          undoShortcut: DEFAULT_UNDO_SHORTCUT,
          commandShortcut: DEFAULT_COMMAND_SHORTCUT,
          blockedContentShortcut: DEFAULT_BLOCKED_CONTENT_SHORTCUT,
          snippetsPageShortcut: DEFAULT_SNIPPETS_PAGE_SHORTCUT,
          vimEnabled: true,
          darkModeEnabled: true,
          inboxZeroEnabled: true,
          archivePopupEnabled: true,
          archiveListMotionReduced: false,
          vimSmoothNavigationEnabled: true,
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
            if (items.blockedContentShortcut) {
              blockedContentShortcut = {
                ...DEFAULT_BLOCKED_CONTENT_SHORTCUT,
                ...items.blockedContentShortcut
              };
            }
            if (items.snippetsPageShortcut) {
              snippetsPageShortcut = {
                ...DEFAULT_SNIPPETS_PAGE_SHORTCUT,
                ...items.snippetsPageShortcut
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
            if (typeof items.archivePopupEnabled === "boolean") {
              setArchivePopupEnabled(items.archivePopupEnabled);
            } else {
              setArchivePopupEnabled(true);
            }
            if (typeof items.archiveListMotionReduced === "boolean") {
              setArchiveListMotionReduced(items.archiveListMotionReduced);
            } else {
              setArchiveListMotionReduced(false);
            }
            if (typeof items.vimSmoothNavigationEnabled === "boolean") {
              vimSmoothNavigationEnabled = items.vimSmoothNavigationEnabled;
            } else {
              vimSmoothNavigationEnabled = true;
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

    startAchievementToastObserver();
    setSnippetsChangeCallback(() => {
      rebuildCommandList();
      if (isCommandOverlayOpen()) {
        refreshCommandList();
      }
    });
    watchSnippetStorage();
    loadSnippetsFromStorage().then(() => {
      rebuildCommandList();
      if (isCommandOverlayOpen()) {
        refreshCommandList();
      }
      startComposeFocusTracking();
      startSnippetInlinePicker();
      startSnippetYourPlaceholderSendGuard();
    });

    // Set up keyboard handler
    let currentHandler = null;
    function updateKeyboardHandler() {
      if (currentHandler) {
        window.removeEventListener("keydown", currentHandler, true);
      }
      currentHandler = createKeyboardHandler({
        undoShortcut,
        commandShortcut,
        blockedContentShortcut,
        snippetsPageShortcut,
        vimEnabled,
        vimSmoothNavigationEnabled
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
        if (changes.blockedContentShortcut && changes.blockedContentShortcut.newValue) {
          blockedContentShortcut = {
            ...DEFAULT_BLOCKED_CONTENT_SHORTCUT,
            ...changes.blockedContentShortcut.newValue
          };
          handlerNeedsUpdate = true;
        }
        if (changes.snippetsPageShortcut && changes.snippetsPageShortcut.newValue) {
          snippetsPageShortcut = {
            ...DEFAULT_SNIPPETS_PAGE_SHORTCUT,
            ...changes.snippetsPageShortcut.newValue
          };
          handlerNeedsUpdate = true;
        }
        if (changes.vimEnabled && typeof changes.vimEnabled.newValue === "boolean") {
          vimEnabled = changes.vimEnabled.newValue;
          handlerNeedsUpdate = true;
        }
        if (
          changes.vimSmoothNavigationEnabled &&
          typeof changes.vimSmoothNavigationEnabled.newValue === "boolean"
        ) {
          vimSmoothNavigationEnabled = changes.vimSmoothNavigationEnabled.newValue;
          handlerNeedsUpdate = true;
        }
        if (
          changes.archiveListMotionReduced &&
          typeof changes.archiveListMotionReduced.newValue === "boolean"
        ) {
          setArchiveListMotionReduced(changes.archiveListMotionReduced.newValue);
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
        if (changes.archivePopupEnabled && typeof changes.archivePopupEnabled.newValue === "boolean") {
          setArchivePopupEnabled(changes.archivePopupEnabled.newValue);
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
            sendResponse(result || { ok: false, error: "Could not apply reminder (Snooze)." });
          }
        } catch (e) {
          sendResponse({ ok: false, error: "Error applying reminder (Snooze)." });
        }
        return true;
      });
    } catch (e) {
      // Ignore if runtime messaging is not available
    }
  });
}

