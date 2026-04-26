// Settings management module
import { browserApi } from "./browserApi.js";

export const DEFAULT_UNDO_SHORTCUT = {
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  key: "z"
};

export const DEFAULT_COMMAND_SHORTCUT = {
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: true,
  key: "k"
};

export const DEFAULT_BLOCKED_CONTENT_SHORTCUT = {
  ctrlKey: false,
  altKey: false,
  shiftKey: true,
  metaKey: true,
  key: "b"
};

class SettingsManager {
  constructor() {
    this.undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
    this.commandShortcut = { ...DEFAULT_COMMAND_SHORTCUT };
    this.blockedContentShortcut = { ...DEFAULT_BLOCKED_CONTENT_SHORTCUT };
    this.vimEnabled = true;
    this.darkModeEnabled = true;
    this.oledModeEnabled = false;
    this.accentColor = '#6366f1';
    this.popupOpacity = 95;
    this.backdropBlurEnabled = true;
    this.inboxZeroEnabled = true;
    this.archivePopupEnabled = true;
    this.optionsBarHidden = false;
    this.vimContext = "auto";
    this.customShortcuts = [];
    this.aiTitleEditingEnabled = true;
    
    this.listeners = new Set();
  }

  // Subscribe to settings changes
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of changes
  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getState());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("Zero: Settings listener error:", e);
      }
    });
  }

  // Get current state
  getState() {
    return {
      undoShortcut: this.undoShortcut,
      commandShortcut: this.commandShortcut,
      blockedContentShortcut: this.blockedContentShortcut,
      vimEnabled: this.vimEnabled,
      darkModeEnabled: this.darkModeEnabled,
      oledModeEnabled: this.oledModeEnabled,
      accentColor: this.accentColor,
      popupOpacity: this.popupOpacity,
      backdropBlurEnabled: this.backdropBlurEnabled,
      inboxZeroEnabled: this.inboxZeroEnabled,
      archivePopupEnabled: this.archivePopupEnabled,
      optionsBarHidden: this.optionsBarHidden,
      vimContext: this.vimContext,
      customShortcuts: this.customShortcuts,
      aiTitleEditingEnabled: this.aiTitleEditingEnabled
    };
  }

  // Load settings from storage
  load() {
    return new Promise((resolve) => {
      try {
        browserApi.storage.sync.get(
          {
            undoShortcut: DEFAULT_UNDO_SHORTCUT,
            commandShortcut: DEFAULT_COMMAND_SHORTCUT,
            blockedContentShortcut: DEFAULT_BLOCKED_CONTENT_SHORTCUT,
            vimEnabled: true,
            darkModeEnabled: true,
            oledModeEnabled: false,
            accentColor: '#6366f1',
            popupOpacity: 95,
            backdropBlurEnabled: true,
            inboxZeroEnabled: true,
            archivePopupEnabled: true,
            optionsBarHidden: false,
            customShortcuts: [],
            aiTitleEditingEnabled: true
          },
          (items) => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              resolve(this.getState());
              return;
            }
            if (items) {
              if (items.undoShortcut) {
                this.undoShortcut = {
                  ...DEFAULT_UNDO_SHORTCUT,
                  ...items.undoShortcut
                };
              }
              if (items.commandShortcut) {
                this.commandShortcut = {
                  ...DEFAULT_COMMAND_SHORTCUT,
                  ...items.commandShortcut
                };
              }
              if (items.blockedContentShortcut) {
                this.blockedContentShortcut = {
                  ...DEFAULT_BLOCKED_CONTENT_SHORTCUT,
                  ...items.blockedContentShortcut
                };
              }
              if (typeof items.vimEnabled === "boolean") {
                this.vimEnabled = items.vimEnabled;
              }
              if (typeof items.darkModeEnabled === "boolean") {
                this.darkModeEnabled = items.darkModeEnabled;
              }
              if (typeof items.oledModeEnabled === "boolean") {
                this.oledModeEnabled = items.oledModeEnabled;
              }
              if (typeof items.accentColor === "string") {
                this.accentColor = items.accentColor;
              }
              if (typeof items.popupOpacity === "number") {
                this.popupOpacity = items.popupOpacity;
              }
              if (typeof items.backdropBlurEnabled === "boolean") {
                this.backdropBlurEnabled = items.backdropBlurEnabled;
              }
              if (typeof items.inboxZeroEnabled === "boolean") {
                this.inboxZeroEnabled = items.inboxZeroEnabled;
              }
              if (typeof items.archivePopupEnabled === "boolean") {
                this.archivePopupEnabled = items.archivePopupEnabled;
              }
              if (typeof items.optionsBarHidden === "boolean") {
                this.optionsBarHidden = items.optionsBarHidden;
              }
              if (Array.isArray(items.customShortcuts)) {
                this.customShortcuts = items.customShortcuts;
              } else {
                this.customShortcuts = [];
              }
              if (typeof items.aiTitleEditingEnabled === "boolean") {
                this.aiTitleEditingEnabled = items.aiTitleEditingEnabled;
              }
            } else {
              this.customShortcuts = [];
            }
            this.notifyListeners();
            resolve(this.getState());
          }
        );
      } catch (e) {
        resolve(this.getState());
      }
    });
  }

  // Watch for storage changes
  watch() {
    try {
      browserApi.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "sync") return;
        
        let changed = false;
        
        if (changes.undoShortcut && changes.undoShortcut.newValue) {
          this.undoShortcut = {
            ...DEFAULT_UNDO_SHORTCUT,
            ...changes.undoShortcut.newValue
          };
          changed = true;
        }
        if (changes.commandShortcut && changes.commandShortcut.newValue) {
          this.commandShortcut = {
            ...DEFAULT_COMMAND_SHORTCUT,
            ...changes.commandShortcut.newValue
          };
          changed = true;
        }
        if (changes.blockedContentShortcut && changes.blockedContentShortcut.newValue) {
          this.blockedContentShortcut = {
            ...DEFAULT_BLOCKED_CONTENT_SHORTCUT,
            ...changes.blockedContentShortcut.newValue
          };
          changed = true;
        }
        if (changes.vimEnabled && typeof changes.vimEnabled.newValue === "boolean") {
          this.vimEnabled = changes.vimEnabled.newValue;
          changed = true;
        }
        if (changes.darkModeEnabled && typeof changes.darkModeEnabled.newValue === "boolean") {
          this.darkModeEnabled = changes.darkModeEnabled.newValue;
          changed = true;
        }
        if (changes.oledModeEnabled && typeof changes.oledModeEnabled.newValue === "boolean") {
          this.oledModeEnabled = changes.oledModeEnabled.newValue;
          changed = true;
        }
        if (changes.accentColor && typeof changes.accentColor.newValue === "string") {
          this.accentColor = changes.accentColor.newValue;
          changed = true;
        }
        if (changes.popupOpacity && typeof changes.popupOpacity.newValue === "number") {
          this.popupOpacity = changes.popupOpacity.newValue;
          changed = true;
        }
        if (changes.backdropBlurEnabled && typeof changes.backdropBlurEnabled.newValue === "boolean") {
          this.backdropBlurEnabled = changes.backdropBlurEnabled.newValue;
          changed = true;
        }
        if (changes.inboxZeroEnabled && typeof changes.inboxZeroEnabled.newValue === "boolean") {
          this.inboxZeroEnabled = changes.inboxZeroEnabled.newValue;
          changed = true;
        }
        if (changes.archivePopupEnabled && typeof changes.archivePopupEnabled.newValue === "boolean") {
          this.archivePopupEnabled = changes.archivePopupEnabled.newValue;
          changed = true;
        }
        if (changes.optionsBarHidden && typeof changes.optionsBarHidden.newValue === "boolean") {
          this.optionsBarHidden = changes.optionsBarHidden.newValue;
          changed = true;
        }
        if (changes.customShortcuts && Array.isArray(changes.customShortcuts.newValue)) {
          this.customShortcuts = changes.customShortcuts.newValue;
          changed = true;
        }
        if (changes.aiTitleEditingEnabled && typeof changes.aiTitleEditingEnabled.newValue === "boolean") {
          this.aiTitleEditingEnabled = changes.aiTitleEditingEnabled.newValue;
          changed = true;
        }
        
        if (changed) {
          this.notifyListeners();
        }
      });
    } catch (e) {
      // Ignore if storage events are not available
    }
  }
}

export const settings = new SettingsManager();

