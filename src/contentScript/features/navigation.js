// Navigation-related helpers extracted from the original content script.

export function findOutlookSettingsButton() {
  const selectors = [
    "#owaSettingsButton",
    "button#owaSettingsButton",
    'button[aria-label="Settings"]',
    'button[title="Settings"]',
    'button[aria-label*="Settings"]',
    'button[title*="Settings"]'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    return text === "settings";
  });
}

function findCalendarButton() {
  const selectors = [
    'button[aria-label="Calendar"]',
    'button[title="Calendar"]',
    'button[aria-label*="Calendar"]',
    'button[title*="Calendar"]'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    return text === "calendar";
  });
}

function findInboxButton() {
  const selectors = [
    'button[aria-label="Mail"]',
    'button[title="Mail"]',
    'button[aria-label*="Mail"]',
    'button[title*="Mail"]',
    'button[aria-label="Inbox"]',
    'button[title="Inbox"]',
    'button[aria-label*="Inbox"]',
    'button[title*="Inbox"]'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    return text === "mail" || text === "inbox";
  });
}

function findBookingsButton() {
  const selectors = [
    'button[aria-label="Bookings"]',
    'button[title="Bookings"]',
    'button[aria-label*="Bookings"]',
    'button[title*="Bookings"]'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    return text === "bookings";
  });
}

function findTodoButton() {
  const selectors = [
    'button[aria-label="To Do"]',
    'button[title="To Do"]',
    'button[aria-label*="To Do"]',
    'button[title*="To Do"]',
    'button[aria-label="Todo"]',
    'button[title="Todo"]',
    'button[aria-label*="Todo"]',
    'button[title*="Todo"]'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    return text === "to do" || text === "todo";
  });
}

export function openOutlookSettings() {
  const button = findOutlookSettingsButton();
  if (!button) {
    return false;
  }
  try {
    /** @type {HTMLElement} */ (button).click();
    return true;
  } catch (e) {
    console.debug("Zero: Failed to click Outlook settings button:", e);
    return false;
  }
}

export function openCalendar() {
  const button = findCalendarButton();
  if (!button) {
    return false;
  }
  try {
    /** @type {HTMLElement} */ (button).click();
    return true;
  } catch (e) {
    console.debug("Zero: Failed to click Calendar button:", e);
    return false;
  }
}

export function openInbox() {
  const button = findInboxButton();
  if (!button) {
    return false;
  }
  try {
    /** @type {HTMLElement} */ (button).click();
    return true;
  } catch (e) {
    console.debug("Zero: Failed to click Inbox button:", e);
    return false;
  }
}

export function openBookings() {
  const button = findBookingsButton();
  if (!button) {
    return false;
  }
  try {
    /** @type {HTMLElement} */ (button).click();
    return true;
  } catch (e) {
    console.debug("Zero: Failed to click Bookings button:", e);
    return false;
  }
}

export function openTodo() {
  const button = findTodoButton();
  if (!button) {
    return false;
  }
  try {
    /** @type {HTMLElement} */ (button).click();
    return true;
  } catch (e) {
    console.debug("Zero: Failed to click To Do button:", e);
    return false;
  }
}


