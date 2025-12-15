// Background script for Outlook Web Keyboard Shortcuts (Manifest V2)
// Clicking the toolbar icon opens the options page in a full tab.

(() => {
  const api = typeof chrome !== "undefined" ? chrome : browser;

  const clickEventSource =
    (api && api.browserAction && api.browserAction.onClicked) ||
    (api && api.action && api.action.onClicked);

  if (clickEventSource) {
    clickEventSource.addListener(() => {
      try {
        if (api.runtime && api.runtime.openOptionsPage) {
          api.runtime.openOptionsPage();
        }
      } catch (e) {
        // best-effort only
      }
    });
  }
})();

