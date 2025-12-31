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

class SettingsManager {
  constructor() {
    this.undoShortcut = { ...DEFAULT_UNDO_SHORTCUT };
    this.commandShortcut = { ...DEFAULT_COMMAND_SHORTCUT };
    this.vimEnabled = true;
    this.darkModeEnabled = true;
    this.inboxZeroEnabled = false;
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
      vimEnabled: this.vimEnabled,
      darkModeEnabled: this.darkModeEnabled,
      inboxZeroEnabled: this.inboxZeroEnabled,
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
            vimEnabled: true,
            darkModeEnabled: true,
            inboxZeroEnabled: false,
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
              if (typeof items.vimEnabled === "boolean") {
                this.vimEnabled = items.vimEnabled;
              }
              if (typeof items.darkModeEnabled === "boolean") {
                this.darkModeEnabled = items.darkModeEnabled;
              }
              if (typeof items.inboxZeroEnabled === "boolean") {
                this.inboxZeroEnabled = items.inboxZeroEnabled;
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
        if (changes.vimEnabled && typeof changes.vimEnabled.newValue === "boolean") {
          this.vimEnabled = changes.vimEnabled.newValue;
          changed = true;
        }
        if (changes.darkModeEnabled && typeof changes.darkModeEnabled.newValue === "boolean") {
          this.darkModeEnabled = changes.darkModeEnabled.newValue;
          changed = true;
        }
        if (changes.inboxZeroEnabled && typeof changes.inboxZeroEnabled.newValue === "boolean") {
          this.inboxZeroEnabled = changes.inboxZeroEnabled.newValue;
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

