// Command bar feature module
import { browserApi } from "../core/browserApi.js";
import { settings } from "../core/settings.js";
import { formatShortcutDisplay, shortcutMatches } from "../core/shortcuts.js";
import { triggerUndo } from "./undo.js";
import {
  openSnoozeAndApplyPreset,
  clickUnsnooze
} from "./snooze.js";
import {
  focusSidebar,
  focusMessageListFromSidebar
} from "./vimMode.js";
import {
  openOutlookSettings,
  openCalendar,
  openInbox,
  openBookings,
  openTodo
} from "./navigation.js";
import commandBarStyles from "../styles/commandBar.css?raw";

// State
let commandOverlay = null;
let commandInput = null;
let commandItems = [];
let commandActiveIndex = -1;
let commandFiltered = [];
let COMMANDS = [];

// Email helper functions (used by summarize/unsubscribe commands)
function getCurrentEmailRoot() {
  return (
    document.getElementById("ConversationReadingPaneContainer") ||
    document.querySelector('[data-app-section="ConversationContainer"]') ||
    document
  );
}

function findUnsubscribeLinkInCurrentEmail() {
  try {
    const root = getCurrentEmailRoot();
    if (!root) return null;

    /** @type {HTMLElement | null} */
    let bestMatch = null;
    let bestScore = 0;

    const lowerIncludes = (value, needle) =>
      typeof value === "string" && value.toLowerCase().includes(needle);
    const normalize = (value) =>
      typeof value === "string" ? value.toLowerCase().replace(/\s+/g, " ").trim() : "";
    const clip = (value, max = 1400) => {
      if (!value) return "";
      return value.length > max ? value.slice(0, max) : value;
    };
    const getContextText = (el) => {
      if (!el) return "";
      const selfText = normalize(el.innerText || el.textContent || "");
      const parentText = normalize(el.parentElement?.innerText || el.parentElement?.textContent || "");
      const grandParentText = normalize(
        el.parentElement?.parentElement?.innerText ||
          el.parentElement?.parentElement?.textContent ||
          ""
      );
      // Combine nearby blocks because many templates use generic anchor text like "here".
      return clip(`${selfText} ${parentText} ${grandParentText}`.trim());
    };

    const textPhrases = [
      { phrase: "unsubscribe", score: 80 },
      { phrase: "wish to unsubscribe", score: 92 },
      { phrase: "no longer wish to receive", score: 90 },
      { phrase: "no longer want to receive", score: 90 },
      { phrase: "be removed from our list", score: 90 },
      { phrase: "removed from our list", score: 88 },
      { phrase: "unsubscribe link", score: 92 },
      { phrase: "opt out", score: 75 },
      { phrase: "remove me", score: 70 },
      { phrase: "remove from this list", score: 86 },
      { phrase: "remove from our list", score: 86 },
      { phrase: "receive emails from us", score: 55 },
      { phrase: "stop receiving", score: 68 },
      { phrase: "stop getting", score: 68 },
      { phrase: "email preferences", score: 64 },
      { phrase: "manage preferences", score: 62 },
      { phrase: "notification settings", score: 58 },
      { phrase: "manage subscription", score: 58 },
      { phrase: "update preferences", score: 56 },
      { phrase: "change preferences", score: 56 },
      { phrase: "communication preferences", score: 54 }
    ];

    const hrefPhrases = [
      { phrase: "unsubscribe", score: 100 },
      { phrase: "encryptedunsubscribe", score: 100 },
      { phrase: "optout", score: 96 },
      { phrase: "opt-out", score: 96 },
      { phrase: "remove", score: 78 },
      { phrase: "preferences", score: 70 },
      { phrase: "subscription", score: 66 },
      { phrase: "email-settings", score: 64 },
      { phrase: "notifications", score: 60 },
      { phrase: "list-manage", score: 62 }
    ];

    const negativePhrases = [
      "resubscribe",
      "subscribe now",
      "subscription plans",
      "upgrade",
      "privacy policy",
      "view in browser"
    ];
    const looksLikeMailtoUnsub = (hrefValue) => {
      const href = normalize(hrefValue);
      return href.startsWith("mailto:") && (href.includes("unsubscribe") || href.includes("remove"));
    };

    const candidates = Array.from(
      root.querySelectorAll("a[href], button, [role='button'], [data-action], [onclick]")
    );

    for (const node of candidates) {
      const el = /** @type {HTMLElement} */ (node);
      if (!el) continue;

      const text = normalize(el.innerText || el.textContent || "");
      const href = normalize(el.getAttribute("href") || "");
      const aria = normalize(el.getAttribute("aria-label") || "");
      const title = normalize(el.getAttribute("title") || "");
      const contextText = getContextText(el);
      const allText = `${text} ${aria} ${title} ${contextText}`.trim();

      if (!allText && !href) continue;

      let score = 0;

      for (const entry of textPhrases) {
        if (lowerIncludes(allText, entry.phrase)) {
          score = Math.max(score, entry.score);
        }
      }

      for (const entry of hrefPhrases) {
        if (lowerIncludes(href, entry.phrase)) {
          score = Math.max(score, entry.score);
        }
      }

      if (looksLikeMailtoUnsub(href)) {
        score = Math.max(score, 92);
      }

      // Generic labels like "here" are often unsubscribe links only when the nearby copy says so.
      if (text === "here" || text === "click here") {
        if (lowerIncludes(contextText, "unsubscribe") || lowerIncludes(contextText, "opt out")) {
          score = Math.max(score, 88);
        }
      }

      // Template pattern: "update your preferences ... unsubscribe link here"
      if (lowerIncludes(contextText, "update your preferences")) {
        score -= 15;
      }
      if (
        (text === "here" || lowerIncludes(text, "update your profile")) &&
        lowerIncludes(contextText, "wish to unsubscribe")
      ) {
        score = Math.max(score, 93);
      }

      for (const bad of negativePhrases) {
        if (lowerIncludes(allText, bad) || lowerIncludes(href, bad)) {
          score -= 50;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = el;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  } catch (e) {
    // best-effort only
  }
  return null;
}

export function clickUnsubscribeLink() {
  const link = findUnsubscribeLinkInCurrentEmail();
  if (!link) {
    // eslint-disable-next-line no-console
    console.debug("Zero: No unsubscribe link found in current email.");
    return false;
  }
  try {
    /** @type {HTMLElement} */ (link).click();
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("Zero: Failed to click unsubscribe link:", e);
    return false;
  }
}

function getCurrentEmailText() {
  try {
    const root = getCurrentEmailRoot() || document;

    /** @type {string[]} */
    const chunks = [];
    const seen = new Set();

    const bodySelectors = [
      'div[role="document"]',
      '[data-message-id] [role="document"]',
      'div[aria-label="Message body"]',
      'div[aria-label="Message content"]'
    ];

    for (const selector of bodySelectors) {
      const nodes = Array.from(root.querySelectorAll(selector));
      if (!nodes.length) continue;
      for (const el of nodes) {
        if (!el) continue;
        const text = (el.innerText || el.textContent || "").trim();
        if (text && !seen.has(text)) {
          seen.add(text);
          chunks.push(text);
        }
      }
    }

    // In Outlook's conversation view, collapsed messages often show in
    // preview blocks like <div class="_nzWz">…</div>. Capture those too
    // so Gemini can see the surrounding context even when only one
    // message is fully expanded.
    const previewNodes = Array.from(root.querySelectorAll("div._nzWz"));
    for (const el of previewNodes) {
      if (!el) continue;
      const text = (el.innerText || el.textContent || "").trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        chunks.push(text);
      }
    }

    if (!chunks.length) {
      return "";
    }

    const full = chunks.join("\n\n---\n\n");
    const maxChars = 20000;
    return full.length > maxChars ? full.slice(full.length - maxChars) : full;
  } catch (e) {
    // best-effort only
  }
  return "";
}

function requestEmailSummary(bodyText) {
  return new Promise((resolve) => {
    try {
      browserApi.runtime.sendMessage(
        {
          type: "oz-summarize-email",
          bodyText: bodyText || ""
        },
        (response) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            resolve({
              ok: false,
              error:
                "Could not reach the background script for summarization. Is the extension enabled?"
            });
            return;
          }
          if (!response) {
            resolve({ ok: false, error: "Unexpected empty response from Gemini." });
            return;
          }
          resolve(response);
        }
      );
    } catch (e) {
      resolve({
        ok: false,
        error: "Unexpected error while requesting a summary from the extension."
      });
    }
  });
}

// Dependencies that will be passed in or imported when those features are extracted
let openSummaryOverlay = null;
let toggleDarkMode = null;
let toggleOptionsBar = null;
let startInboxZeroObserver = null;
let startElementPicker = null;
let executeCustomShortcut = null;

export function setCommandBarDependencies(deps) {
  openSummaryOverlay = deps.openSummaryOverlay;
  toggleDarkMode = deps.toggleDarkMode;
  toggleOptionsBar = deps.toggleOptionsBar;
  startInboxZeroObserver = deps.startInboxZeroObserver;
  startElementPicker = deps.startElementPicker;
  executeCustomShortcut = deps.executeCustomShortcut;
}

export function summarizeCurrentEmail() {
  const bodyText = getCurrentEmailText();
  if (!bodyText) {
    if (openSummaryOverlay) {
      openSummaryOverlay({
        title: "Email summary",
        body: "Could not find any visible email content to summarize.",
        isError: true
      });
    }
    return;
  }

  if (openSummaryOverlay) {
    openSummaryOverlay({
      title: "Summarizing…",
      body: "Summarizing the current email with Gemini. This usually takes a moment.",
      isLoading: true
    });
  }

  requestEmailSummary(bodyText).then((result) => {
    if (!openSummaryOverlay) return;
    
    if (!result || !result.ok) {
      const msg =
        (result && result.error) ||
        "Gemini could not generate a summary. Please try again in a moment.";
      openSummaryOverlay({
        title: "Summary unavailable",
        body: msg,
        isError: true
      });
      return;
    }

    const summary = (result && result.summary) || "";
    if (!summary) {
      openSummaryOverlay({
        title: "Summary unavailable",
        body: "Gemini returned an empty summary for this email.",
        isError: true
      });
      return;
    }

    openSummaryOverlay({
      title: "Email summary",
      body: summary,
      isError: false
    });
  });
}

// Command list building
export function rebuildCommandList() {
  const state = settings.getState();
  
  // Start with base commands
  COMMANDS = [
    {
      id: "undo",
      title: "Undo last action",
      subtitle: "Trigger Outlook's built-in Undo for message actions",
      action: () => {
        triggerUndo();
      }
    },
    {
      id: "summarize-email",
      title: "Summarize current email",
      subtitle: "Use Gemini to highlight key points from the open message",
      shortcutHint: "Command bar · Gemini",
      action: () => {
        summarizeCurrentEmail();
      }
    },
    {
      id: "unsubscribe",
      title: "Unsubscribe",
      subtitle: "Find and click an unsubscribe link in the current email",
      action: () => {
        clickUnsubscribeLink();
      }
    },
    {
      id: "snooze-later-today",
      title: "Snooze – Later today",
      subtitle: "Move selected message to later today",
      shortcutHint: "S, then preset",
      action: () => {
        openSnoozeAndApplyPreset("laterToday");
      }
    },
    {
      id: "snooze-tomorrow",
      title: "Snooze – Tomorrow",
      subtitle: "Move selected message to tomorrow morning",
      shortcutHint: "S, then preset",
      action: () => {
        openSnoozeAndApplyPreset("tomorrow");
      }
    },
    {
      id: "snooze-this-weekend",
      title: "Snooze – This weekend",
      subtitle: "Move selected message to this weekend",
      shortcutHint: "S, then preset",
      action: () => {
        openSnoozeAndApplyPreset("thisWeekend");
      }
    },
    {
      id: "snooze-next-week",
      title: "Snooze – Next week",
      subtitle: "Move selected message to next week",
      shortcutHint: "S, then preset",
      action: () => {
        openSnoozeAndApplyPreset("nextWeek");
      }
    },
    {
      id: "unsnooze",
      title: "Unsnooze",
      subtitle: "Move scheduled message back to Inbox",
      shortcutHint: "S, then Unsnooze",
      action: () => {
        clickUnsnooze();
      }
    },
    {
      id: "focus-sidebar",
      title: "Focus sidebar",
      subtitle: "Jump focus to folder list/navigation",
      shortcutHint: "h",
      action: () => {
        focusSidebar();
      }
    },
    {
      id: "focus-message-list",
      title: "Focus message list",
      subtitle: "Jump focus back to the message list",
      shortcutHint: "l (from sidebar)",
      action: () => {
        focusMessageListFromSidebar();
      }
    },
    {
      id: "toggle-inbox-zero",
      title: "Enable celebration (WIP)",
      subtitle: "Toggle celebration overlay when inbox reaches zero",
      action: () => {
        if (!startInboxZeroObserver) return;
        try {
          const state = settings.getState();
          const newValue = !state.inboxZeroEnabled;
          browserApi.storage.sync.set({ inboxZeroEnabled: newValue }, () => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              // eslint-disable-next-line no-console
              console.debug("Zero: Could not toggle inbox zero setting:", browserApi.runtime.lastError);
              return;
            }
            // Update SettingsManager state immediately so command bar reads correct state
            settings.inboxZeroEnabled = newValue;
            if (newValue) {
              startInboxZeroObserver();
            }
            // Re-render command list to update the toggle command's display text
            if (isCommandOverlayOpen()) {
              refreshCommandList();
            }
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug("Zero: Could not toggle inbox zero setting:", e);
        }
      }
    },
    {
      id: "toggle-options-bar",
      title: "Hide/show Outlook options",
      subtitle: "Toggle visibility of Outlook options bar and header",
      action: () => {
        if (toggleOptionsBar) {
          toggleOptionsBar();
        }
      }
    },
    {
      id: "toggle-dark-mode",
      title: "Toggle dark mode",
      subtitle: "Switch between dark and light theme for overlays",
      action: () => {
        if (toggleDarkMode) {
          toggleDarkMode();
        }
      }
    },
    {
      id: "options",
      title: "Options",
      subtitle: "Open Zero for Outlook options page",
      action: () => {
        try {
          browserApi.runtime.sendMessage(
            {
              type: "oz-open-options"
            },
            () => {
              // Ignore response/errors
            }
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug("Zero: Could not open options page:", e);
        }
      }
    },
    {
      id: "outlook-settings",
      title: "Outlook settings",
      subtitle: "Open Outlook's built-in settings panel",
      action: () => {
        openOutlookSettings();
      }
    },
    {
      id: "calendar",
      title: "Calendar",
      subtitle: "Open Calendar in Outlook",
      action: () => {
        openCalendar();
      }
    },
    {
      id: "inbox",
      title: "Inbox",
      subtitle: "Open Mail/Inbox in Outlook",
      action: () => {
        openInbox();
      }
    },
    {
      id: "bookings",
      title: "Bookings",
      subtitle: "Open Bookings in Outlook",
      action: () => {
        openBookings();
      }
    },
    {
      id: "todo",
      title: "To Do",
      subtitle: "Open To Do in Outlook",
      action: () => {
        openTodo();
      }
    },
    {
      id: "add-custom-shortcut",
      title: "Add custom shortcut",
      subtitle: "Select an element on screen to add a keyboard shortcut",
      action: () => {
        if (startElementPicker) {
          startElementPicker();
        }
      }
    }
  ];

  // Add custom shortcuts as commands (all of them, not just those with keyboard shortcuts)
  const customShortcuts = state.customShortcuts || [];
  customShortcuts.forEach((customShortcut) => {
    COMMANDS.push({
      id: customShortcut.id,
      title: customShortcut.description || "Custom shortcut",
      subtitle: customShortcut.description || "Custom shortcut", // Mirror the title
      shortcutHint: customShortcut.shortcut && customShortcut.shortcut.key
        ? formatShortcutDisplay(customShortcut.shortcut)
        : "",
      action: () => {
        if (executeCustomShortcut) {
          executeCustomShortcut(customShortcut);
        }
      }
    });
  });
}

// Display helpers
function getCommandDisplayTitle(cmd) {
  const state = settings.getState();
  
  if (cmd.id === "toggle-inbox-zero") {
    if (state.inboxZeroEnabled) {
      return "Disable celebration (WIP)";
    } else {
      return "Enable celebration (WIP)";
    }
  }
  if (cmd.id === "toggle-options-bar") {
    if (state.optionsBarHidden) {
      return "Show Outlook options";
    } else {
      return "Hide Outlook options";
    }
  }
  if (cmd.id === "toggle-dark-mode") {
    if (state.darkModeEnabled) {
      return "Switch to light mode";
    } else {
      return "Switch to dark mode";
    }
  }
  return cmd.title || "";
}

function getCommandDisplaySubtitle(cmd) {
  const state = settings.getState();
  
  if (cmd.id === "toggle-inbox-zero") {
    if (state.inboxZeroEnabled) {
      return "Disable celebration overlay when inbox reaches zero";
    } else {
      return "Enable celebration overlay when inbox reaches zero";
    }
  }
  if (cmd.id === "toggle-options-bar") {
    if (state.optionsBarHidden) {
      return "Show the Outlook options bar and header";
    } else {
      return "Hide the Outlook options bar and header";
    }
  }
  if (cmd.id === "toggle-dark-mode") {
    if (state.darkModeEnabled) {
      return "Change overlays and Outlook to light theme";
    } else {
      return "Change overlays and Outlook to dark theme";
    }
  }
  return cmd.subtitle || "";
}

function getCommandShortcutHint(cmd) {
  if (!cmd) return "";
  if (cmd.id === "undo") {
    const state = settings.getState();
    return formatShortcutDisplay(state.undoShortcut);
  }
  return cmd.shortcutHint || "";
}

// Filtering
function scoreCommandMatch(cmd, query) {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const title = getCommandDisplayTitle(cmd);
  const subtitle = getCommandDisplaySubtitle(cmd);
  const haystack =
    title.toLowerCase() +
    " " +
    subtitle.toLowerCase() +
    " " +
    (cmd.id || "").toLowerCase();
  if (haystack === q) return 100;
  if (haystack.startsWith(q)) return 50;
  // Check for full word matches (word boundaries) - these should rank higher than partial matches
  const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (wordBoundaryRegex.test(haystack)) return 40;
  if (haystack.indexOf(q) !== -1) return 25;
  return 0;
}

function getFilteredCommands(query) {
  const scored = COMMANDS.map((cmd) => ({
    cmd,
    score: scoreCommandMatch(cmd, query)
  }));
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.cmd);
}

// Styles
function ensureCommandBarStyles() {
  if (document.getElementById("oz-command-style")) return;
  const style = document.createElement("style");
  style.id = "oz-command-style";
  style.textContent = commandBarStyles;
  document.documentElement.appendChild(style);
}

// Overlay management
export function closeCommandOverlay() {
  if (commandOverlay && commandOverlay.parentNode) {
    commandOverlay.parentNode.removeChild(commandOverlay);
  }
  commandOverlay = null;
  commandInput = null;
  commandItems = [];
  commandActiveIndex = -1;
  commandFiltered = [];
}

// Refresh the command list display (useful when settings change)
export function refreshCommandList() {
  if (!commandOverlay || !commandInput) return;
  const currentQuery = commandInput.value || "";
  renderCommandList(currentQuery);
}

function setCommandSelection(index) {
  if (!commandItems || !commandItems.length) return;
  const clamped = Math.max(0, Math.min(commandItems.length - 1, index));
  commandActiveIndex = clamped;
  commandItems.forEach((el, i) => {
    if (!el) return;
    if (i === clamped) {
      el.classList.add("oz-command-item-active");
    } else {
      el.classList.remove("oz-command-item-active");
    }
  });
}

function renderCommandList(query) {
  if (!commandOverlay) return;
  const list = commandOverlay.querySelector(".oz-command-list");
  const empty = commandOverlay.querySelector(".oz-command-empty");
  if (!list) return;

  const filtered = getFilteredCommands(query);
  commandFiltered = filtered;
  list.replaceChildren();
  commandItems = [];
  commandActiveIndex = -1;

  if (!filtered.length) {
    if (empty) {
      empty.textContent = query ? `No commands match "${query}"` : "No commands available.";
      empty.style.display = "block";
    }
    return;
  }
  if (empty) {
    empty.style.display = "none";
  }

  filtered.forEach((cmd, index) => {
    const item = document.createElement("div");
    item.className = "oz-command-item";
    const title = getCommandDisplayTitle(cmd);
    const subtitle = getCommandDisplaySubtitle(cmd);
    const shortcutHint = getCommandShortcutHint(cmd);

    const main = document.createElement("div");
    main.className = "oz-command-item-main";

    const titleEl = document.createElement("div");
    titleEl.className = "oz-command-item-title";
    titleEl.textContent = title;

    const subtitleEl = document.createElement("div");
    subtitleEl.className = "oz-command-item-subtitle";
    subtitleEl.textContent = subtitle;

    main.appendChild(titleEl);
    main.appendChild(subtitleEl);
    item.appendChild(main);

    if (shortcutHint) {
      const shortcutEl = document.createElement("div");
      shortcutEl.className = "oz-command-item-shortcut";
      shortcutEl.textContent = shortcutHint;
      item.appendChild(shortcutEl);
    }
    item.addEventListener("mouseenter", () => {
      setCommandSelection(index);
    });
    item.addEventListener("click", () => {
      if (cmd && typeof cmd.action === "function") {
        try {
          cmd.action();
          closeCommandOverlay();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug("Zero command action error:", e);
          closeCommandOverlay();
        }
      }
    });
    list.appendChild(item);
    commandItems.push(item);
  });

  setCommandSelection(0);
}

export function openCommandOverlay() {
  ensureCommandBarStyles();
  if (commandOverlay) {
    if (commandInput) {
      // Re-render the list to ensure dynamic titles are up to date
      const currentQuery = commandInput.value || "";
      renderCommandList(currentQuery);
      commandInput.focus();
      commandInput.select();
    }
    return;
  }

  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;

  const backdrop = document.createElement("div");
  backdrop.className =
    "oz-command-backdrop " + (darkModeEnabled ? "oz-command-dark" : "oz-command-light");

  const modal = document.createElement("div");
  modal.className =
    "oz-command-modal " + (darkModeEnabled ? "oz-command-dark" : "oz-command-light");

  const inputWrap = document.createElement("div");
  inputWrap.className = "oz-command-input-wrapper";

  const icon = document.createElement("span");
  icon.className = "oz-command-input-icon";
  icon.textContent = "⌘";

  const input = document.createElement("input");
  input.className = "oz-command-input";
  input.type = "text";
  input.placeholder = "Type a command…";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");

  inputWrap.appendChild(icon);
  inputWrap.appendChild(input);

  const list = document.createElement("div");
  list.className = "oz-command-list";

  const empty = document.createElement("div");
  empty.className = "oz-command-empty";

  modal.appendChild(inputWrap);
  modal.appendChild(list);
  modal.appendChild(empty);

  backdrop.appendChild(modal);
  document.documentElement.appendChild(backdrop);

  commandOverlay = backdrop;
  commandInput = modal.querySelector(".oz-command-input");

  renderCommandList("");

  if (commandInput) {
    commandInput.addEventListener("input", () => {
      renderCommandList(commandInput.value || "");
    });
    window.setTimeout(() => {
      try {
        commandInput.focus();
        commandInput.select();
      } catch (e) {
        // ignore
      }
    }, 0);
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeCommandOverlay();
    }
  });
}

export function handleCommandOverlayKeydown(event) {
  if (!commandOverlay) return false;
  const key = (event.key || "").toLowerCase();

  const state = settings.getState();
  if (state.commandShortcut && shortcutMatches(event, state.commandShortcut)) {
    event.preventDefault();
    event.stopPropagation();
    closeCommandOverlay();
    return true;
  }

  if (key === "escape") {
    event.preventDefault();
    event.stopPropagation();
    closeCommandOverlay();
    return true;
  }

  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    if (key === "arrowdown") {
      event.preventDefault();
      event.stopPropagation();
      if (!commandItems.length) return true;
      const next =
        commandActiveIndex === -1
          ? 0
          : (commandActiveIndex + 1) % Math.max(1, commandItems.length);
      setCommandSelection(next);
      return true;
    }
    if (key === "arrowup") {
      event.preventDefault();
      event.stopPropagation();
      if (!commandItems.length) return true;
      const next =
        commandActiveIndex === -1
          ? commandItems.length - 1
          : (commandActiveIndex - 1 + commandItems.length) %
            Math.max(1, commandItems.length);
      setCommandSelection(next);
      return true;
    }
    if (key === "enter") {
      event.preventDefault();
      event.stopPropagation();
      // If there are filtered commands, execute the selected one (or the first one if none selected)
      if (commandFiltered.length > 0) {
        const index = commandActiveIndex >= 0 ? commandActiveIndex : 0;
        const cmd = commandFiltered[index];
        if (cmd && typeof cmd.action === "function") {
          closeCommandOverlay();
          try {
            cmd.action();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.debug("Zero command action error:", e);
          }
        }
      }
      return true;
    }
  }

  return false;
}

export function updateCommandOverlayTheme() {
  if (!commandOverlay) return;
  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;
  
  const backdrop = commandOverlay;
  const modal = backdrop.querySelector(".oz-command-modal");
  if (!modal) return;

  backdrop.className =
    "oz-command-backdrop " + (darkModeEnabled ? "oz-command-dark" : "oz-command-light");
  modal.className =
    "oz-command-modal " + (darkModeEnabled ? "oz-command-dark" : "oz-command-light");
}

// Helper for keyboard handler
export function isCommandOverlayOpen() {
  return commandOverlay !== null;
}

export function isElementInCommandOverlay(element) {
  if (!commandOverlay || !element) return false;
  return commandOverlay.contains(element);
}

