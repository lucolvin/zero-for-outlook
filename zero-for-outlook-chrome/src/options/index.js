import { formatShortcut } from "./shortcutDisplay.js";
import { setStatus } from "./statusMessages.js";
import { applyTheme } from "./theme.js";

const browserApi = typeof chrome !== "undefined" ? chrome : browser;

const DEFAULT_UNDO_SHORTCUT = {
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  key: "z"
};
const DEFAULT_COMMAND_SHORTCUT = {
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: true,
  key: "k"
};

const shortcutInput = document.getElementById("undoShortcut");
const commandShortcutInput = document.getElementById("commandShortcut");
const undoStatusEl = document.getElementById("status");
const commandStatusEl = document.getElementById("status-command");
const vimStatusEl = document.getElementById("status-vim");
const darkStatusEl = document.getElementById("status-dark");
const geminiStatusEl = document.getElementById("status-gemini");
const clearBtn = document.getElementById("clearUndo");
const clearCommandBtn = document.getElementById("clearCommand");
const vimToggle = document.getElementById("vimEnabled");
const darkToggle = document.getElementById("darkModeEnabled");
const geminiInput = document.getElementById("geminiApiKey");
const saveGeminiBtn = document.getElementById("saveGeminiKey");
const clearGeminiBtn = document.getElementById("clearGeminiKey");

function setUndoStatus(message) {
  setStatus(undoStatusEl, message);
}

function setCommandStatus(message) {
  setStatus(commandStatusEl, message);
}

function setVimStatus(message) {
  setStatus(vimStatusEl, message);
}

function setDarkStatus(message) {
  setStatus(darkStatusEl, message);
}

function setGeminiStatus(message) {
  setStatus(geminiStatusEl, message);
}

function saveVimEnabled(enabled) {
  try {
    browserApi.storage.sync.set({ vimEnabled: enabled }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        setVimStatus("Could not update vim setting (storage error).");
        return;
      }
      setVimStatus(enabled ? "Vim navigation enabled." : "Vim navigation disabled.");
    });
  } catch (e) {
    setVimStatus("Could not update vim setting.");
  }
}

function saveDarkModeEnabled(enabled) {
  try {
    browserApi.storage.sync.set({ darkModeEnabled: enabled }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        setDarkStatus("Could not update dark mode (storage error).");
        return;
      }
      applyTheme(enabled);
      setDarkStatus(enabled ? "Dark mode enabled." : "Dark mode disabled.");
    });
  } catch (e) {
    setDarkStatus("Could not update dark mode.");
  }
}

function saveGeminiApiKey(value) {
  try {
    browserApi.storage.sync.set({ geminiApiKey: value || "" }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        setGeminiStatus("Could not save Gemini API key (storage error).");
        return;
      }
      setGeminiStatus(value ? "Gemini API key saved." : "Gemini API key cleared.");
    });
  } catch (e) {
    setGeminiStatus("Could not save Gemini API key.");
  }
}

function saveShortcut(shortcut) {
  try {
    browserApi.storage.sync.set({ undoShortcut: shortcut }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        setUndoStatus("Could not save shortcut (storage error).");
        return;
      }
      shortcutInput.value = formatShortcut(shortcut);
      setUndoStatus("Shortcut saved.");
    });
  } catch (e) {
    setUndoStatus("Could not save shortcut.");
  }
}

function saveCommandShortcut(shortcut) {
  try {
    browserApi.storage.sync.set({ commandShortcut: shortcut }, () => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        setCommandStatus("Could not save command bar shortcut (storage error).");
        return;
      }
      if (commandShortcutInput) {
        commandShortcutInput.value = formatShortcut(shortcut);
      }
      setCommandStatus("Command bar shortcut saved.");
    });
  } catch (e) {
    setCommandStatus("Could not save command bar shortcut.");
  }
}

function createShortcutHandler(saveFn) {
  return (event) => {
    event.preventDefault();
    event.stopPropagation();

    const key = (event.key || "").toLowerCase();

    const ignoredKeys = ["shift", "control", "alt", "meta", "capslock", "tab"];
    if (!key || ignoredKeys.includes(key)) {
      return;
    }

    const shortcut = {
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      key
    };

    saveFn(shortcut);
  };
}

function restoreOptions() {
  try {
    browserApi.storage.sync.get(
      {
        undoShortcut: DEFAULT_UNDO_SHORTCUT,
        commandShortcut: DEFAULT_COMMAND_SHORTCUT,
        vimEnabled: true,
        darkModeEnabled: true,
        geminiApiKey: ""
      },
      (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          shortcutInput.value = formatShortcut(DEFAULT_UNDO_SHORTCUT);
          return;
        }
        const shortcut = (items && items.undoShortcut) || DEFAULT_UNDO_SHORTCUT;
        shortcutInput.value = formatShortcut(shortcut);

        if (commandShortcutInput) {
          const cmdShortcut = (items && items.commandShortcut) || DEFAULT_COMMAND_SHORTCUT;
          commandShortcutInput.value = formatShortcut(cmdShortcut);
        }

        if (vimToggle) {
          const enabled =
            items && typeof items.vimEnabled === "boolean" ? items.vimEnabled : true;
          vimToggle.checked = enabled;
        }

        const darkEnabled =
          items && typeof items.darkModeEnabled === "boolean" ? items.darkModeEnabled : true;
        if (darkToggle) {
          darkToggle.checked = darkEnabled;
        }
        applyTheme(darkEnabled);

        if (geminiInput) {
          geminiInput.value = (items && items.geminiApiKey) || "";
        }
      }
    );
  } catch (e) {
    shortcutInput.value = formatShortcut(DEFAULT_UNDO_SHORTCUT);
  }
}

function clearShortcut() {
  const emptyShortcut = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: ""
  };
  saveShortcut(emptyShortcut);
}

function clearCommandShortcut() {
  const emptyShortcut = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: ""
  };
  saveCommandShortcut(emptyShortcut);
}

function clearGeminiApiKey() {
  if (geminiInput) {
    geminiInput.value = "";
  }
  saveGeminiApiKey("");
}

if (shortcutInput) {
  shortcutInput.addEventListener("keydown", createShortcutHandler(saveShortcut));
  shortcutInput.addEventListener("keyup", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

if (commandShortcutInput) {
  commandShortcutInput.addEventListener("keydown", createShortcutHandler(saveCommandShortcut));
  commandShortcutInput.addEventListener("keyup", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", clearShortcut);
}

if (clearCommandBtn) {
  clearCommandBtn.addEventListener("click", clearCommandShortcut);
}

if (vimToggle) {
  vimToggle.addEventListener("change", (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    saveVimEnabled(!!target.checked);
  });
}

if (darkToggle) {
  darkToggle.addEventListener("change", (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    saveDarkModeEnabled(!!target.checked);
  });
}

if (saveGeminiBtn && geminiInput) {
  saveGeminiBtn.addEventListener("click", () => {
    saveGeminiApiKey(geminiInput.value.trim());
  });
}

if (clearGeminiBtn) {
  clearGeminiBtn.addEventListener("click", clearGeminiApiKey);
}

if (geminiInput) {
  geminiInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      saveGeminiApiKey(geminiInput.value.trim());
    }
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);


