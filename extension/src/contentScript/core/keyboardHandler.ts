// @ts-nocheck
// Central keyboard handler that coordinates all feature key handlers
import { isEditableElement, shortcutMatches } from "./shortcuts.ts";
import { triggerUndo } from "../features/undo.ts";
import { triggerShowBlockedContent } from "../features/blockedContent.ts";
import {
  sendShiftArrow,
  moveSelection,
  moveNavVertical,
  focusSidebar,
  focusMessageListFromSidebar,
  resetVimContext,
  getVimContext
} from "../features/vimMode.ts";
import { requestVimVerticalNav } from "../features/vimNavigation.ts";
import { shouldVimDeferToOutlook } from "../features/fullscreenReading.ts";
import {
  openSnoozeOverlay,
  closeSnoozeOverlay,
  openSnoozeAndApplyPreset,
  clickUnsnooze,
  moveSnoozeSelection,
  isSnoozeOverlayOpen,
  getActiveSnoozeButton
} from "../features/snooze.ts";
import {
  openCommandOverlay,
  closeCommandOverlay,
  handleCommandOverlayKeydown,
  isCommandOverlayOpen,
  isElementInCommandOverlay
} from "../features/commandBar.ts";
import {
  closeSummaryOverlay,
  isSummaryOverlayOpen
} from "../features/summary.ts";
import {
  startElementPicker,
  closeElementPicker,
  executeCustomShortcut,
  isElementPickerActive
} from "../features/elementPicker.ts";
import { hasSelectedMessage } from "./messageList.ts";
import { settings } from "./settings.ts";
import { browserApi } from "./browserApi.ts";

export function createKeyboardHandler(options) {
  const {
    undoShortcut,
    commandShortcut,
    blockedContentShortcut,
    snippetsPageShortcut,
    vimEnabled,
    vimSmoothNavigationEnabled: vimSmoothRaw
  } = options;
  const vimSmoothNavigationEnabled = vimSmoothRaw !== false;

  return function onKeyDown(event) {
    try {
      // Ignore synthetic events (including our own Shift+Arrow events)
      // so that we only ever react to real user key presses.
      if (!event.isTrusted) {
        return;
      }

      const key = (event.key || "").toLowerCase();
      const targetNode = /** @type {Node | null} */ (event.target);

      // If element picker is active, only allow escape
      if (isElementPickerActive()) {
        if (key === "escape") {
          event.preventDefault();
          event.stopPropagation();
          closeElementPicker();
        }
        // Block all other keys while picker is active
        return;
      }

      // If the command bar is open, it owns all key handling
      if (isCommandOverlayOpen()) {
        // Handle special keys (arrow keys, enter, escape) first, even if typing in the input field
        if (handleCommandOverlayKeydown(event)) {
          return;
        }
        
        // Check if the event target is inside the command overlay (e.g., the input field)
        const target = /** @type {HTMLElement | null} */ (targetNode);
        if (target && isElementInCommandOverlay(target)) {
          // If typing in the command overlay input field, let it through but stop propagation to Outlook
          event.stopPropagation();
          return;
        }
        
        // For other keys outside the overlay, block them from reaching Outlook
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (isSummaryOverlayOpen() && key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        closeSummaryOverlay();
        return;
      }

      // Command bar shortcut works even while composing/editing (overrides Outlook Cmd+K → Insert link, etc.)
      if (commandShortcut && shortcutMatches(event, commandShortcut)) {
        event.preventDefault();
        event.stopPropagation();
        if (isCommandOverlayOpen()) {
          closeCommandOverlay();
        } else {
          openCommandOverlay();
        }
        return;
      }

      if (
        snippetsPageShortcut &&
        snippetsPageShortcut.key &&
        shortcutMatches(event, snippetsPageShortcut)
      ) {
        event.preventDefault();
        event.stopPropagation();
        try {
          browserApi.runtime.sendMessage({ type: "oz-open-options", hash: "snippets" }, () => {});
        } catch {
          // ignore
        }
        return;
      }

      // Custom shortcuts also work while composing/editing; other extension shortcuts do not (see below).
      const customShortcuts = settings.getState().customShortcuts || [];
      for (const customShortcut of customShortcuts) {
        if (customShortcut.shortcut && shortcutMatches(event, customShortcut.shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          executeCustomShortcut(customShortcut);
          return;
        }
      }

      // Ignore if user is typing in a "normal" input/textarea/contentEditable
      if (isEditableElement(targetNode)) {
        // When typing, fall back to default context.
        resetVimContext();
        return;
      }

      // Multi‑select support: Shift+j / Shift+k behave like
      // Shift+ArrowDown / Shift+ArrowUp in the message list, allowing
      // you to select ranges of messages that can then be reminded (Snooze) or
      // archived together using Outlook's own commands.
      if (
        vimEnabled &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        (key === "j" || key === "k") &&
        !isSnoozeOverlayOpen()
      ) {
        if (shouldVimDeferToOutlook()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (vimSmoothNavigationEnabled) {
          requestVimVerticalNav("shift", key === "j" ? "down" : "up");
        } else {
          sendShiftArrow(key === "j" ? "down" : "up");
        }
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
        if (isSnoozeOverlayOpen()) {
          if (key === "j") {
            event.preventDefault();
            event.stopPropagation();
            moveSnoozeSelection("down");
            return;
          }
          if (key === "k") {
            event.preventDefault();
            event.stopPropagation();
            moveSnoozeSelection("up");
            return;
          }
          if (key === "enter") {
            const btn = getActiveSnoozeButton();
            if (btn) {
              const preset = btn.getAttribute("data-oz-snooze");
              if (preset) {
                event.preventDefault();
                event.stopPropagation();
                closeSnoozeOverlay();
                if (preset === "unsnooze") {
                  clickUnsnooze();
                } else {
                  openSnoozeAndApplyPreset(preset);
                }
              }
            }
            return;
          }
          // Block sidebar/message navigation keys while the Remind me / Move to Inbox overlay is active.
          if (key === "h" || key === "l") {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        if (key === "s") {
          event.preventDefault();
          event.stopPropagation();
          if (isSnoozeOverlayOpen()) {
            closeSnoozeOverlay();
          } else {
            if (hasSelectedMessage()) {
              openSnoozeOverlay();
            }
          }
          return;
        }
        if (key === "escape" && isSnoozeOverlayOpen()) {
          event.preventDefault();
          event.stopPropagation();
          closeSnoozeOverlay();
          return;
        }
      }

      // Vim-style navigation (no modifiers):
      // - j / k: move vertically within current context
      //   * message list in default "auto" context
      //   * sidebar while vimContext === "sidebar" (even if Outlook steals DOM focus)
      // - h: focus / pin the sidebar (vimContext = "sidebar")
      // - l: if in sidebar context, move into the message list and reset context
      if (
        vimEnabled &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        if (key === "j" || key === "k") {
          if (shouldVimDeferToOutlook()) {
            return;
          }
        }
        if (key === "j") {
          event.preventDefault();
          event.stopPropagation();
          if (getVimContext() === "sidebar") {
            if (vimSmoothNavigationEnabled) {
              requestVimVerticalNav("sidebar", "down");
            } else {
              moveNavVertical("down");
            }
          } else if (vimSmoothNavigationEnabled) {
            requestVimVerticalNav("list", "down");
          } else {
            moveSelection("down");
          }
          return;
        }
        if (key === "k") {
          event.preventDefault();
          event.stopPropagation();
          if (getVimContext() === "sidebar") {
            if (vimSmoothNavigationEnabled) {
              requestVimVerticalNav("sidebar", "up");
            } else {
              moveNavVertical("up");
            }
          } else if (vimSmoothNavigationEnabled) {
            requestVimVerticalNav("list", "up");
          } else {
            moveSelection("up");
          }
          return;
        }
        if (key === "h") {
          event.preventDefault();
          event.stopPropagation();
          focusSidebar();
          return;
        }
        if (key === "l") {
          event.preventDefault();
          event.stopPropagation();
          if (getVimContext() === "sidebar") {
            focusMessageListFromSidebar();
          } else {
            focusSidebar();
          }
          return;
        }
      }

      if (undoShortcut && shortcutMatches(event, undoShortcut)) {
        event.preventDefault();
        event.stopPropagation();
        triggerUndo();
        return;
      }

      if (blockedContentShortcut && shortcutMatches(event, blockedContentShortcut)) {
        event.preventDefault();
        event.stopPropagation();
        triggerShowBlockedContent();
      }
    } catch (e) {
      // Never let errors break the page
      // eslint-disable-next-line no-console
      console.debug("Outlook Keyboard Shortcuts content script error:", e);
    }
  };
}

