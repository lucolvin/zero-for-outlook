// DOM utility functions
export function waitForElement(selector, maxAttempts = 50, interval = 50) {
  return new Promise((resolve) => {
    let attempts = 0;
    const checkElement = () => {
      attempts++;
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      if (attempts >= maxAttempts) {
        resolve(null);
        return;
      }
      window.setTimeout(checkElement, interval);
    };
    checkElement();
  });
}

export function waitForElementByText(tagName, text, maxAttempts = 50, interval = 50) {
  return new Promise((resolve) => {
    let attempts = 0;
    const checkElement = () => {
      attempts++;
      const elements = Array.from(document.querySelectorAll(tagName));
      const found = elements.find(el => {
        const elText = (el.textContent || "").trim();
        return elText === text;
      });
      if (found) {
        resolve(found);
        return;
      }
      if (attempts >= maxAttempts) {
        resolve(null);
        return;
      }
      window.setTimeout(checkElement, interval);
    };
    checkElement();
  });
}

export function isScheduledView() {
  try {
    const url = window.location.href || "";
    if (!url) return false;

    const scheduledPattern = /\/mail\/[^/]*\/scheduled(?:[/?#]|$)/;
    if (scheduledPattern.test(url)) {
      return true;
    }

    if (url.indexOf("/mail/scheduled/") !== -1 || url.endsWith("/mail/scheduled")) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

export function isInboxView() {
  try {
    const url = window.location.href || "";
    if (!url) return false;

    const inboxPattern = /\/mail\/[^/]*\/inbox(?:[/?#]|$)/i;
    if (inboxPattern.test(url)) {
      return true;
    }

    if (
      url.toLowerCase().indexOf("/mail/inbox/") !== -1 ||
      url.toLowerCase().endsWith("/mail/inbox")
    ) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

