// @ts-nocheck
// Archive popup feature: optionally hide Outlook's "Archived" toast.

let archivePopupEnabled = true;
let archivePopupObserver = null;

function isUndoActionElement(el) {
  if (!el) return false;
  const ariaLabel = (el.getAttribute("aria-label") || "").trim().toLowerCase();
  const title = (el.getAttribute("title") || "").trim().toLowerCase();
  const text = (el.textContent || "").trim().toLowerCase();
  return ariaLabel === "undo" || title === "undo" || text === "undo";
}

function isArchivedToastElement(toast) {
  if (!toast || !toast.classList || !toast.classList.contains("fui-Toast")) return false;

  const titleEl = toast.querySelector(".fui-ToastTitle");
  const titleText = (titleEl?.textContent || "").trim().toLowerCase();
  if (titleText !== "archived") return false;

  const actionCandidates = toast.querySelectorAll("button, [role='button'], a");
  for (const candidate of actionCandidates) {
    if (isUndoActionElement(candidate)) {
      return true;
    }
  }
  return false;
}

function hideToast(toast) {
  if (!toast || toast.getAttribute("data-oz-archive-toast-hidden") === "true") return;
  toast.setAttribute("data-oz-archive-toast-hidden", "true");
  toast.dataset.ozArchiveToastPreviousDisplay = toast.style.display || "";
  toast.style.setProperty("display", "none", "important");
}

function unhideAllToasts() {
  const hiddenToasts = document.querySelectorAll('[data-oz-archive-toast-hidden="true"]');
  hiddenToasts.forEach((toast) => {
    const previousDisplay = toast.dataset.ozArchiveToastPreviousDisplay || "";
    if (previousDisplay) {
      toast.style.display = previousDisplay;
    } else {
      toast.style.removeProperty("display");
    }
    delete toast.dataset.ozArchiveToastPreviousDisplay;
    toast.removeAttribute("data-oz-archive-toast-hidden");
  });
}

function scanAndHideArchivedToasts(rootNode) {
  if (!rootNode) return;

  if (rootNode.nodeType === Node.ELEMENT_NODE) {
    const element = /** @type {Element} */ (rootNode);
    if (isArchivedToastElement(element)) {
      hideToast(element);
    }
    const toasts = element.querySelectorAll(".fui-Toast");
    toasts.forEach((toast) => {
      if (isArchivedToastElement(toast)) {
        hideToast(toast);
      }
    });
  }
}

function stopArchivePopupObserver() {
  if (archivePopupObserver) {
    archivePopupObserver.disconnect();
    archivePopupObserver = null;
  }
}

function startArchivePopupObserver() {
  stopArchivePopupObserver();
  scanAndHideArchivedToasts(document.body);
  archivePopupObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => scanAndHideArchivedToasts(node));
    });
  });
  archivePopupObserver.observe(document.body, { childList: true, subtree: true });
}

export function setArchivePopupEnabled(enabled) {
  archivePopupEnabled = enabled !== false;
  if (archivePopupEnabled) {
    stopArchivePopupObserver();
    unhideAllToasts();
    return;
  }

  if (!document.body) {
    return;
  }
  startArchivePopupObserver();
}

export function getArchivePopupEnabled() {
  return archivePopupEnabled;
}
