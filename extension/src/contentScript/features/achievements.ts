// @ts-nocheck
// Tracks lightweight stats and unlocks badges when milestones are hit.

import { browserApi } from "../core/browserApi.ts";

export const OZ_ACHIEVEMENT_STORAGE_KEY = "ozAchievementState";

const BADGES = [
  { id: "first_archive", label: "Archivist", desc: "Archive a message once", test: (s) => s.stats.archives >= 1 },
  { id: "archives_10", label: "Declutterer", desc: "Archive 10 messages", test: (s) => s.stats.archives >= 10 },
  {
    id: "command_explorer",
    label: "Command explorer",
    desc: "Open the command bar 5 times",
    test: (s) => s.stats.commandBarOpens >= 5
  },
  {
    id: "reminder_friend",
    label: "Reminder friend",
    desc: "Set 5 reminders",
    test: (s) => s.stats.remindersSet >= 5
  },
  {
    id: "snippet_author",
    label: "Snippet author",
    desc: "Save at least one snippet",
    test: (s) => s.stats.snippetsSaved >= 1
  },
  {
    id: "snippet_pro",
    label: "Snippet pro",
    desc: "Insert snippets 10 times",
    test: (s) => s.stats.snippetsInserted >= 10
  },
  {
    id: "streak_3",
    label: "On a roll",
    desc: "Reach a 3-day inbox zero streak",
    test: (s) => s.stats.maxInboxZeroStreak >= 3
  },
  {
    id: "streak_7",
    label: "Week warrior",
    desc: "Reach a 7-day inbox zero streak",
    test: (s) => s.stats.maxInboxZeroStreak >= 7
  }
];

function defaultState() {
  return {
    v: 2,
    stats: {
      archives: 0,
      commandBarOpens: 0,
      remindersSet: 0,
      snippetsSaved: 0,
      snippetsInserted: 0,
      maxInboxZeroStreak: 0
    },
    unlocked: [],
    log: []
  };
}

function load(cb) {
  try {
    browserApi.storage.sync.get({ [OZ_ACHIEVEMENT_STORAGE_KEY]: null }, (items) => {
      let s = items && items[OZ_ACHIEVEMENT_STORAGE_KEY];
      if (!s || typeof s !== "object") {
        s = defaultState();
      } else {
        const d = defaultState();
        s.stats = { ...d.stats, ...(s.stats || {}) };
        s.unlocked = Array.isArray(s.unlocked) ? s.unlocked : [];
        s.log = Array.isArray(s.log) ? s.log.slice(-80) : [];
      }
      cb(s);
    });
  } catch {
    cb(defaultState());
  }
}

function save(next) {
  try {
    browserApi.storage.sync.set({ [OZ_ACHIEVEMENT_STORAGE_KEY]: next }, () => {});
  } catch {
    // ignore
  }
}

function pushLog(state, type, note) {
  state.log.push({ t: new Date().toISOString(), type, note: note || "" });
  state.log = state.log.slice(-80);
}

function evaluateBadges(state) {
  for (const b of BADGES) {
    if (state.unlocked.includes(b.id)) continue;
    if (b.test(state)) {
      state.unlocked.push(b.id);
      pushLog(state, "badge", b.id);
    }
  }
}

export function recordArchiveDetected() {
  load((state) => {
    state.stats.archives += 1;
    pushLog(state, "archive");
    evaluateBadges(state);
    save(state);
  });
}

export function recordCommandBarOpened() {
  load((state) => {
    state.stats.commandBarOpens += 1;
    evaluateBadges(state);
    save(state);
  });
}

export function recordReminderSet() {
  load((state) => {
    state.stats.remindersSet += 1;
    evaluateBadges(state);
    save(state);
  });
}

export function recordSnippetInserted() {
  load((state) => {
    state.stats.snippetsInserted += 1;
    evaluateBadges(state);
    save(state);
  });
}

export function recordSnippetSavedCount(count) {
  const n = Math.floor(Number(count)) || 0;
  if (n < 1) return;
  load((state) => {
    state.stats.snippetsSaved = Math.max(state.stats.snippetsSaved || 0, n);
    evaluateBadges(state);
    save(state);
  });
}

export function updateMaxInboxZeroStreak(days) {
  const n = Math.floor(Number(days)) || 0;
  load((state) => {
    if (n > (state.stats.maxInboxZeroStreak || 0)) {
      state.stats.maxInboxZeroStreak = n;
      evaluateBadges(state);
      save(state);
    }
  });
}

let toastObserverStarted = false;

export function startAchievementToastObserver() {
  if (toastObserverStarted) return;
  toastObserverStarted = true;

  function isArchivedToast(toast) {
    if (!toast || !toast.classList || !toast.classList.contains("fui-Toast")) return false;
    const titleEl = toast.querySelector(".fui-ToastTitle");
    const titleText = (titleEl?.textContent || "").trim().toLowerCase();
    return titleText === "archived";
  }

  function maybeCount(toast) {
    if (!isArchivedToast(toast)) return;
    if (toast.getAttribute("data-oz-ach-archive") === "1") return;
    toast.setAttribute("data-oz-ach-archive", "1");
    recordArchiveDetected();
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    const el = /** @type {Element} */ (node);
    maybeCount(el);
    el.querySelectorAll?.(".fui-Toast").forEach((t) => maybeCount(t));
  }

  const obs = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((n) => scan(n));
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

export function getBadgeDefinitions() {
  return BADGES;
}
