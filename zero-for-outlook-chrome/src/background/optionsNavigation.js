const api = typeof chrome !== "undefined" ? chrome : browser;

export function openOptionsPage() {
  try {
    if (api.runtime && api.runtime.openOptionsPage) {
      api.runtime.openOptionsPage();
    }
  } catch (e) {
    // best-effort only
  }
}

export function registerActionClick() {
  const clickEventSource =
    (api && api.browserAction && api.browserAction.onClicked) ||
    (api && api.action && api.action.onClicked);

  if (!clickEventSource) return;

  clickEventSource.addListener(() => {
    openOptionsPage();
  });
}


