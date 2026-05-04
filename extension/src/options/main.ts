// @ts-nocheck
// Outlook Web Keyboard Shortcuts - Options Page

export {};

(() => {
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
  const DEFAULT_BLOCKED_CONTENT_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: true,
    metaKey: true,
    key: "b"
  };
  const DEFAULT_SNIPPETS_PAGE_SHORTCUT = {
    ctrlKey: false,
    altKey: false,
    shiftKey: true,
    metaKey: true,
    key: "y"
  };

  const shortcutInput = document.getElementById("undoShortcut");
  const commandShortcutInput = document.getElementById("commandShortcut");
  const blockedContentShortcutInput = document.getElementById("blockedContentShortcut");
  const undoStatusEl = document.getElementById("status");
  const commandStatusEl = document.getElementById("status-command");
  const blockedContentStatusEl = document.getElementById("status-blocked-content");
  const vimStatusEl = document.getElementById("status-vim");
  const darkStatusEl = document.getElementById("status-dark");
  const accentStatusEl = document.getElementById("status-accent");
  const oledStatusEl = document.getElementById("status-oled");
  const opacityStatusEl = document.getElementById("status-opacity");
  const inboxZeroStatusEl = document.getElementById("status-inbox-zero");
  const archivePopupStatusEl = document.getElementById("status-archive-popup");
  const geminiStatusEl = document.getElementById("status-gemini");
  const popupOpacitySlider = document.getElementById("popupOpacity");
  const popupOpacityValue = document.getElementById("popupOpacityValue");
  const clearBtn = document.getElementById("clearUndo");
  const clearCommandBtn = document.getElementById("clearCommand");
  const clearBlockedContentBtn = document.getElementById("clearBlockedContent");
  const snippetsPageShortcutInput = document.getElementById("snippetsPageShortcut");
  const clearSnippetsPageShortcutBtn = document.getElementById("clearSnippetsPageShortcut");
  const snippetsPageShortcutStatusEl = document.getElementById("status-snippets-page-shortcut");
  const vimToggle = document.getElementById("vimEnabled");
  const vimSmoothNavigationToggle = document.getElementById("vimSmoothNavigationEnabled");
  const archiveListMotionToggle = document.getElementById("archiveListMotionReduced");
  const lightModeBtn = document.getElementById("lightModeBtn");
  const darkModeBtn = document.getElementById("darkModeBtn");
  const oledEnabledBtn = document.getElementById("oledEnabledBtn");
  const oledDisabledBtn = document.getElementById("oledDisabledBtn");
  const accentColorButtons = document.querySelectorAll(".oz-accent-color");
  const accentCustomModalOverlay = document.getElementById("accentCustomModalOverlay");
  const accentCustomColorInput = document.getElementById("accentCustomColorInput");
  const accentCustomModalApply = document.getElementById("accentCustomModalApply");
  const accentCustomModalCancel = document.getElementById("accentCustomModalCancel");
  const accentCustomModalClose = document.getElementById("accentCustomModalClose");
  const accentCustomModalError = document.getElementById("accentCustomModalError");
  const backdropBlurToggle = document.getElementById("backdropBlurEnabled");
  const inboxZeroToggle = document.getElementById("inboxZeroEnabled");
  const archivePopupToggle = document.getElementById("archivePopupEnabled");
  const saveBtn = document.getElementById("oz-save-btn");
  const resetBtn = document.getElementById("oz-reset-btn");
  const saveStatus = document.getElementById("oz-save-status");
  const geminiInput = document.getElementById("geminiApiKey");
  const saveGeminiBtn = document.getElementById("saveGeminiKey");
  const clearGeminiBtn = document.getElementById("clearGeminiKey");
  const customShortcutsList = document.getElementById("customShortcutsList");
  const customStatusEl = document.getElementById("status-custom");
  const manualAddCustomShortcutBtn = document.getElementById("manualAddCustomShortcut");
  const aiTitleEditingToggle = document.getElementById("aiTitleEditingEnabled");
  const aiTitleEditingStatusEl = document.getElementById("status-ai-title-editing");
  const accountStatusEl = document.getElementById("status-account");
  const accountSignInBtn = document.getElementById("accountSignIn");
  const accountSignOutBtn = document.getElementById("accountSignOut");
  const accountSyncNowBtn = document.getElementById("accountSyncNow");
  const accountStatusLabel = document.getElementById("accountStatusLabel");
  const accountLastSynced = document.getElementById("accountLastSynced");
  const sidebarAccountName = document.getElementById("sidebarAccountName");
  const sidebarAccountAvatar = document.getElementById("sidebarAccountAvatar");
  const sidebarAccountEmail = document.getElementById("sidebarAccountEmail");
  const sidebarVersionLink = document.getElementById("sidebarVersionLink");
  const aboutInfoModalOverlay = document.getElementById("aboutInfoModalOverlay");
  const aboutInfoModalClose = document.getElementById("aboutInfoModalClose");
  const aboutInfoVersionLabel = document.getElementById("aboutInfoModalVersionLabel");
  const aboutInfoExtensionName = document.getElementById("aboutInfoExtensionName");
  const aboutInfoVersionValue = document.getElementById("aboutInfoVersionValue");
  const accountCloudSyncToggle = document.getElementById("accountCloudSyncToggle");
  const accountCloudSyncHelp = document.getElementById("accountCloudSyncHelp");
  const accountCloudOptInToggle = document.getElementById("accountCloudOptInToggle");
  const accountCloudOptInHelp = document.getElementById("accountCloudOptInHelp");
  const syncNowModalOverlay = document.getElementById("syncNowModalOverlay");
  const syncNowModalClose = document.getElementById("syncNowModalClose");
  const syncNowModalCancel = document.getElementById("syncNowModalCancel");
  const syncNowModalPush = document.getElementById("syncNowModalPush");
  const syncNowModalPull = document.getElementById("syncNowModalPull");
  const CLOUD_ACCOUNT_OPT_IN_KEY = "ozCloudAccountOptIn";
  const INBOX_ZERO_STREAK_KEY = "inboxZeroStreak";
  const OZ_ACHIEVEMENT_STORAGE_KEY = "ozAchievementState";

  const ACHIEVEMENT_META = [
    { id: "first_archive", label: "Archivist", desc: "Archive a message once" },
    { id: "archives_10", label: "Declutterer", desc: "Archive 10 messages" },
    { id: "command_explorer", label: "Command explorer", desc: "Open the command bar 5 times" },
    { id: "reminder_friend", label: "Reminder friend", desc: "Set 5 reminders" },
    { id: "snippet_author", label: "Snippet author", desc: "Save at least one snippet" },
    { id: "snippet_pro", label: "Snippet pro", desc: "Insert snippets 10 times" },
    { id: "streak_3", label: "On a roll", desc: "Reach a 3-day inbox zero streak" },
    { id: "streak_7", label: "Week warrior", desc: "Reach a 7-day inbox zero streak" }
  ];

  function updateStatsFromStorage(items) {
    const elDays = document.getElementById("ozStatStreakDays");
    const elDate = document.getElementById("ozStatLastZeroDate");
    if (!elDays && !elDate) {
      return;
    }
    const raw = items && items[INBOX_ZERO_STREAK_KEY];
    const days =
      raw && Number.isFinite(Number(raw.days)) && Number(raw.days) > 0
        ? Math.floor(Number(raw.days))
        : 0;
    const lastHit =
      raw && typeof raw.lastHitDate === "string" && raw.lastHitDate.trim()
        ? raw.lastHitDate.trim()
        : null;
    if (elDays) {
      elDays.textContent = days > 0 ? String(days) : "—";
    }
    if (elDate) {
      elDate.textContent = lastHit || "—";
    }
  }

  function renderAchievementsFromStorage() {
    const grid = document.getElementById("ozAchievementsGrid");
    const logEl = document.getElementById("ozAchievementLog");
    if (!grid && !logEl) return;
    try {
      browserApi.storage.sync.get({ [OZ_ACHIEVEMENT_STORAGE_KEY]: null }, (items) => {
        const raw = items && items[OZ_ACHIEVEMENT_STORAGE_KEY];
        const unlocked = raw && Array.isArray(raw.unlocked) ? raw.unlocked : [];
        const log = raw && Array.isArray(raw.log) ? raw.log.slice().reverse() : [];
        if (grid) {
          grid.innerHTML = "";
          ACHIEVEMENT_META.forEach((meta) => {
            const card = document.createElement("div");
            card.className =
              "oz-achievement-card" +
              (unlocked.includes(meta.id) ? " oz-achievement-unlocked" : "");
            const t = document.createElement("div");
            t.className = "oz-achievement-card-title";
            t.textContent = meta.label;
            const d = document.createElement("div");
            d.className = "oz-achievement-card-desc";
            d.textContent = meta.desc;
            card.appendChild(t);
            card.appendChild(d);
            grid.appendChild(card);
          });
        }
        if (logEl) {
          logEl.innerHTML = "";
          log.slice(0, 12).forEach((entry) => {
            const li = document.createElement("li");
            const when = entry.t ? String(entry.t).replace("T", " ").slice(0, 19) : "";
            li.textContent = `${when} — ${entry.type}${entry.note ? ": " + entry.note : ""}`;
            logEl.appendChild(li);
          });
        }
      });
    } catch {
      // ignore
    }
  }

  const SIDE_PANEL_NAV_URL_KEY = "ozSidePanelNavigateUrl";
  const LEGACY_LOCAL_ONLY_KEY = "ozLocalOnlyMode";
  const MANUAL_SHORTCUT_WARNING_KEY = "manualShortcutAdvancedWarningShown";
  const ACCOUNT_STATUS_POLL_FAST_MS = 4000;
  const ACCOUNT_STATUS_POLL_MEDIUM_MS = 15000;
  const ACCOUNT_STATUS_POLL_SLOW_MS = 60000;

  // Pending changes object
  let pendingChanges = {};
  let hasUnsavedChanges = false;
  let accountStatusPollTimer = null;

  const PAGE_INFO = {
    general: {
      title: "General",
      subtitle: "Configure keyboard shortcuts, navigation, and archive behavior.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    appearance: {
      title: "Appearance",
      subtitle: "Customize the look and feel of Zero for Outlook.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.2 4.2a2.8 2.8 0 0 1 4 0l1.6 1.6a2.8 2.8 0 0 1 0 4l-8.9 8.9a3 3 0 0 1-2.1.9H6.9a1.7 1.7 0 0 1-1.7-1.7v-1.9a3 3 0 0 1 .9-2.1l8.1-8.1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M12.8 5.6 18.4 11.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M5.5 16.5h3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`
    },
    custom: {
      title: "Custom shortcuts",
      subtitle: "Manage custom shortcuts and optional LLM-generated names.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 10h2.5M11.5 10h5.5M7 14h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    snippets: {
      title: "Snippets",
      subtitle: "Saved snippets, shortcut to this tab, and insert text in Outlook.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`
    },
    ai: {
      title: "AI",
      subtitle: "Optional Gemini integration for summarizing the current email.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 3v4M3 5h4M19 17v4M17 19h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    account: {
      title: "Account",
      subtitle: "Sign in and sync extension settings with your cloud account.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
      </svg>`
    },
    about: {
      title: "About",
      subtitle: "How the extension works, privacy, and links.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    "import-export": {
      title: "Import / Export",
      subtitle: "Back up or restore your extension settings as a JSON file.",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    }
  };

  const tabButtons = document.querySelectorAll("[data-panel]");
  const PRESET_ACCENT_COLORS = new Set([
    "#6366f1",
    "#ec4899",
    "#f97316",
    "#eab308",
    "#10b981",
    "#14b8a6",
    "#3b82f6"
  ]);
  const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  function setPageHeader(panelId) {
    const info = PAGE_INFO[panelId] || PAGE_INFO.general;
    
    const titleEl = document.getElementById("oz-page-title");
    if (titleEl) titleEl.textContent = info.title;
    
    const subtitleEl = document.getElementById("oz-page-subtitle");
    if (subtitleEl) subtitleEl.textContent = info.subtitle;
    
    const iconEl = document.getElementById("oz-page-icon");
    if (iconEl) iconEl.innerHTML = info.icon;
  }

  function exportSettingsAndShortcuts() {
    try {
      browserApi.storage.sync.get(null, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          window.alert(
            "Could not read settings: " + (browserApi.runtime.lastError.message || "storage error")
          );
          return;
        }
        const payload = {
          meta: {
            exportVersion: 1,
            exportedAt: new Date().toISOString(),
            extension: "zero-for-outlook"
          },
          sync: items && typeof items === "object" ? items : {}
        };
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `zero-for-outlook-settings-${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      window.alert("Export failed.");
    }
  }

  function extractSyncPayloadFromImport(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    if (parsed.sync && typeof parsed.sync === "object" && !Array.isArray(parsed.sync)) {
      return parsed.sync;
    }
    const hintKeys = [
      "undoShortcut",
      "commandShortcut",
      "blockedContentShortcut",
      "vimEnabled",
      "darkModeEnabled",
      "inboxZeroEnabled",
      "archivePopupEnabled",
      "optionsBarHidden",
      "customShortcuts",
      "geminiApiKey",
      "aiTitleEditingEnabled",
      "manualShortcutAdvancedWarningShown",
      "ozSnippets",
      "snippetsPageShortcut",
      "ozAchievementState",
      "vimSmoothNavigationEnabled",
      "archiveListMotionReduced"
    ];
    if (hintKeys.some((k) => Object.prototype.hasOwnProperty.call(parsed, k))) {
      return parsed;
    }
    return null;
  }

  function applyImportedSyncPayload(syncPayload) {
    browserApi.storage.sync.clear(() => {
      if (browserApi.runtime && browserApi.runtime.lastError) {
        window.alert(
          "Could not clear settings before import: " +
            (browserApi.runtime.lastError.message || "storage error")
        );
        return;
      }
      browserApi.storage.sync.set(syncPayload, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          window.alert(
            "Could not save imported settings: " +
              (browserApi.runtime.lastError.message || "storage error")
          );
          return;
        }
        restoreOptions();
        loadCustomShortcuts();
        window.alert("Settings imported successfully.");
      });
    });
  }

  function importSettingsFromJsonText(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      window.alert("This file is not valid JSON.");
      return;
    }
    const syncPayload = extractSyncPayloadFromImport(parsed);
    if (!syncPayload || typeof syncPayload !== "object") {
      window.alert(
        "Unrecognized backup format. Use a JSON file exported from Zero for Outlook (or a plain sync object with known keys)."
      );
      return;
    }
    if (
      !window.confirm(
        "Replace all extension settings with this file? Current settings will be removed. This cannot be undone."
      )
    ) {
      return;
    }
    applyImportedSyncPayload(syncPayload);
  }

  function wireImportSettingsUi() {
    const trigger = document.getElementById("importSettingsTrigger");
    const fileInput = document.getElementById("importSettingsFile");
    if (!trigger || !fileInput) return;

    trigger.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = typeof e.target?.result === "string" ? e.target.result : "";
        if (!text) {
          window.alert("Could not read file.");
          return;
        }
        importSettingsFromJsonText(text);
      };
      reader.onerror = () => {
        window.alert("Could not read file.");
      };
      reader.readAsText(file);
    });
  }

  function activatePanel(panelId) {
    if (!panelId) return;

    tabButtons.forEach((tab) => {
      const active = tab.getAttribute("data-panel") === panelId;
      const isAccountTab = tab.classList.contains("oz-sidebar-account-tab");
      if (isAccountTab) {
        tab.classList.toggle("oz-sidebar-account-tab-active", active);
      } else {
        tab.classList.toggle("oz-tab-active", active);
      }
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll(".oz-panel").forEach((panel) => {
      const id = panel.id && panel.id.startsWith("panel-") ? panel.id.slice("panel-".length) : "";
      const active = id === panelId;
      panel.classList.toggle("oz-panel-active", active);
    });

    setPageHeader(panelId);
  }

  function formatShortcut(shortcut) {
    if (!shortcut || !shortcut.key) return "Not set";

    const parts = [];
    if (shortcut.ctrlKey) parts.push("Ctrl");
    if (shortcut.altKey) parts.push("Alt");
    if (shortcut.shiftKey) parts.push("Shift");
    if (shortcut.metaKey) parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Meta");
    parts.push(shortcut.key.toUpperCase());

    return parts.join(" + ");
  }

  function setStatus(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add("oz-status-visible");
    setTimeout(() => {
      el.classList.remove("oz-status-visible");
    }, 2000);
  }

  function setUndoStatus(message) {
    setStatus(undoStatusEl, message);
  }

  function setCommandStatus(message) {
    setStatus(commandStatusEl, message);
  }

  function setBlockedContentStatus(message) {
    setStatus(blockedContentStatusEl, message);
  }

  function setVimStatus(message) {
    setStatus(vimStatusEl, message);
  }

  function setDarkStatus(message) {
    setStatus(darkStatusEl, message);
  }

  function setAccentStatus(message) {
    setStatus(accentStatusEl, message);
  }

  function setOledStatus(message) {
    setStatus(oledStatusEl, message);
  }

  function setOpacityStatus(message) {
    setStatus(opacityStatusEl, message);
  }

  function markUnsavedChanges() {
    hasUnsavedChanges = true;
    if (saveStatus) {
      saveStatus.textContent = "Unsaved changes";
      saveStatus.style.color = "var(--oz-accent)";
    }
    if (saveBtn) {
      saveBtn.disabled = false;
    }
    if (resetBtn) {
      resetBtn.classList.remove("oz-hidden");
    }
  }

  function markChangesSaved() {
    hasUnsavedChanges = false;
    pendingChanges = {};
    if (saveStatus) {
      saveStatus.textContent = "All changes saved";
      saveStatus.style.color = "var(--oz-accent)";
    }
    if (saveBtn) {
      saveBtn.disabled = true;
    }
    if (resetBtn) {
      resetBtn.classList.add("oz-hidden");
    }
  }

  function resetAllPendingChanges() {
    if (!hasUnsavedChanges) return;

    // Restore original values from storage
    try {
      browserApi.storage.sync.get(null, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          return;
        }

        // Restore all UI elements to their saved values
        restoreOptions();
        
        // Clear pending changes
        markChangesSaved();
      });
    } catch (e) {
      console.error("Could not reset changes:", e);
    }
  }

  function updatePendingChange(key, value) {
    pendingChanges[key] = value;
    markUnsavedChanges();
  }

  function setGeminiStatus(message) {
    setStatus(geminiStatusEl, message);
  }

  function setInboxZeroStatus(message) {
    setStatus(inboxZeroStatusEl, message);
  }

  function setArchivePopupStatus(message) {
    setStatus(archivePopupStatusEl, message);
  }

  function setCustomStatus(message) {
    setStatus(customStatusEl, message);
  }

  function setAccountStatus(message) {
    setStatus(accountStatusEl, message);
  }

  function openSyncNowModal() {
    if (!syncNowModalOverlay) return;
    syncNowModalOverlay.classList.remove("oz-hidden");
    syncNowModalOverlay.setAttribute("aria-hidden", "false");
  }

  function closeSyncNowModal() {
    if (!syncNowModalOverlay) return;
    syncNowModalOverlay.classList.add("oz-hidden");
    syncNowModalOverlay.setAttribute("aria-hidden", "true");
  }

  function openAboutInfoModal() {
    if (!aboutInfoModalOverlay) return;
    aboutInfoModalOverlay.classList.remove("oz-hidden");
    aboutInfoModalOverlay.setAttribute("aria-hidden", "false");
    if (sidebarVersionLink) {
      sidebarVersionLink.setAttribute("aria-expanded", "true");
    }
  }

  function closeAboutInfoModal() {
    if (!aboutInfoModalOverlay) return;
    aboutInfoModalOverlay.classList.add("oz-hidden");
    aboutInfoModalOverlay.setAttribute("aria-hidden", "true");
    if (sidebarVersionLink) {
      sidebarVersionLink.setAttribute("aria-expanded", "false");
    }
  }

  function initAboutInfo() {
    try {
      const manifest =
        browserApi && browserApi.runtime && typeof browserApi.runtime.getManifest === "function"
          ? browserApi.runtime.getManifest()
          : null;
      const extensionName = manifest && manifest.name ? String(manifest.name) : "Zero for Outlook";
      const version = manifest && manifest.version ? String(manifest.version) : "0.0.0";

      if (sidebarVersionLink) {
        sidebarVersionLink.textContent = `v${version}`;
      }
      if (aboutInfoVersionLabel) {
        aboutInfoVersionLabel.textContent = `Version ${version}`;
      }
      if (aboutInfoExtensionName) {
        aboutInfoExtensionName.textContent = extensionName;
      }
      if (aboutInfoVersionValue) {
        aboutInfoVersionValue.textContent = version;
      }
    } catch (e) {
      // Ignore rendering metadata errors
    }
  }

  function runtimeMessage(message) {
    return new Promise((resolve) => {
      try {
        if (!browserApi.runtime || !browserApi.runtime.sendMessage) {
          resolve({ ok: false, error: "Runtime messaging unavailable." });
          return;
        }
        browserApi.runtime.sendMessage(message, (response) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            resolve({ ok: false, error: browserApi.runtime.lastError.message || "Message failed." });
            return;
          }
          resolve(response || { ok: false, error: "No response." });
        });
      } catch (e) {
        resolve({ ok: false, error: "Message failed." });
      }
    });
  }

  /**
   * Chrome/Chromium Side Panel must be opened from this page within the click gesture sequence.
   * Firefox uses browser.sidebarAction.open() under the same rule.
   */
  async function openZeroSidePanelBestEffort() {
    try {
      const ch = typeof chrome !== "undefined" ? chrome : null;
      if (ch?.sidePanel?.open && ch.tabs?.query) {
        function tabLooksLikeHostPage(t) {
          if (!t || typeof t.url !== "string") return false;
          const u = t.url;
          if (u.startsWith("chrome-extension:")) return false;
          if (u.startsWith("chrome://")) return false;
          if (u.startsWith("edge://")) return false;
          if (u.startsWith("devtools://")) return false;
          if (u.startsWith("about:")) return false;
          return /^https?:/i.test(u) || u === "";
        }

        const tabsActive = await new Promise((resolve) => {
          try {
            ch.tabs.query({ active: true, lastFocusedWindow: true }, (t) => {
              resolve(Array.isArray(t) ? t : []);
            });
          } catch (_e) {
            resolve([]);
          }
        });
        let tab = tabsActive[0];

        if (tab && !tabLooksLikeHostPage(tab) && typeof tab.windowId === "number") {
          const inWin = await new Promise((resolve) => {
            try {
              ch.tabs.query({ windowId: tab.windowId }, (t) => {
                resolve(Array.isArray(t) ? t : []);
              });
            } catch (_e2) {
              resolve([]);
            }
          });
          const outlookish = inWin.find((x) => {
            const u = x && typeof x.url === "string" ? x.url : "";
            return (
              /outlook\.live\.com|outlook\.office|outlook\.cloud\.microsoft/i.test(u) ||
              /\.microsoft\.com\//i.test(u)
            );
          });
          const firstWeb = inWin.find((x) => tabLooksLikeHostPage(x));
          tab = outlookish || firstWeb || tab;
        }

        try {
          if (tab && typeof tab.id === "number") {
            await ch.sidePanel.setOptions({
              tabId: tab.id,
              path: "sidepanel.html",
              enabled: true
            });
          } else {
            await ch.sidePanel.setOptions({
              path: "sidepanel.html",
              enabled: true
            });
          }
        } catch (_eOpt) {
          /* ignore */
        }

        try {
          if (tab && typeof tab.id === "number") {
            await ch.sidePanel.open({ tabId: tab.id });
            return true;
          }
        } catch (_openTab) {
          /* fallback */
        }

        try {
          if (tab && typeof tab.windowId === "number") {
            await ch.sidePanel.open({ windowId: tab.windowId });
            return true;
          }
        } catch (_openWin) {
          /* ignore */
        }

        return false;
      }
    } catch (_e3) {
      /* fallback to Firefox */
    }

    try {
      const br =
        typeof globalThis.browser !== "undefined"
          ? globalThis.browser
          : typeof browser !== "undefined"
            ? browser
            : null;
      if (typeof br?.sidebarAction?.open === "function") {
        await br.sidebarAction.open();
        return true;
      }
    } catch (_ffSidebar) {
      /* ignore */
    }

    return false;
  }

  async function applyChromeHostedSidePanelFromSettings(result, panelPrimeSucceeded) {
    if (!result || !result.ok || !result.needsExtensionSidePanelOpen) {
      return result;
    }

    // Sidebar-only policy: retry opening the panel a few times, but never fallback to popup/tab.
    if (!panelPrimeSucceeded) {
      let opened = false;
      for (let i = 0; i < 3; i += 1) {
        // keep retries short so click feedback still feels immediate
        await new Promise((resolve) => setTimeout(resolve, 120));
        opened = await openZeroSidePanelBestEffort();
        if (opened) break;
      }
      if (!opened) {
        return {
          ...result,
          ok: false,
          error: "Could not open the side panel. Please click Sign in again."
        };
      }
    }

    return result;
  }

  function formatDateTime(ms) {
    if (!ms || Number.isNaN(ms)) return "Never";
    try {
      return new Date(ms).toLocaleString();
    } catch (e) {
      return "Never";
    }
  }

  function readCloudAccountOptIn() {
    return new Promise((resolve) => {
      try {
        browserApi.storage.local.get(null, (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            resolve(false);
            return;
          }
          const store = items || {};
          if (Object.prototype.hasOwnProperty.call(store, CLOUD_ACCOUNT_OPT_IN_KEY)) {
            resolve(!!store[CLOUD_ACCOUNT_OPT_IN_KEY]);
            return;
          }
          if (Object.prototype.hasOwnProperty.call(store, LEGACY_LOCAL_ONLY_KEY)) {
            const migratedOptIn = !store[LEGACY_LOCAL_ONLY_KEY];
            try {
              browserApi.storage.local.remove(LEGACY_LOCAL_ONLY_KEY);
            } catch (removeErr) {
              // Ignore
            }
            browserApi.storage.local.set({ [CLOUD_ACCOUNT_OPT_IN_KEY]: migratedOptIn }, () => {
              resolve(migratedOptIn);
            });
            return;
          }
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  async function applyCloudAccountOptOut() {
    await new Promise((resolve, reject) => {
      try {
        browserApi.storage.local.set({ [CLOUD_ACCOUNT_OPT_IN_KEY]: false }, () => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            reject(new Error(browserApi.runtime.lastError.message));
            return;
          }
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
    await runtimeMessage({ type: "oz-auth-signout" });
    setAccountStatus("Cloud account is off. Settings stay on this device.");
    await refreshAccountStatus();
  }

  async function refreshAccountStatus() {
    const cloudOptIn = await readCloudAccountOptIn();
    if (accountCloudOptInToggle) {
      accountCloudOptInToggle.checked = cloudOptIn;
    }

    const status = await runtimeMessage({ type: "oz-auth-get-status" });
    const signedIn = !!status?.signedIn;
    const cloudSyncEnabled = !!(status && status.cloudSyncEnabled);
    const profileName =
      (status && status.profile && typeof status.profile.name === "string" && status.profile.name.trim()) ||
      "Account";
    const profileEmail =
      (status && status.profile && typeof status.profile.email === "string" && status.profile.email.trim()) ||
      "";
    const profileImage =
      (status &&
        status.profile &&
        typeof status.profile.imageUrl === "string" &&
        status.profile.imageUrl.trim()) ||
      "icons/icon-48.png";

    if (accountStatusLabel) {
      accountStatusLabel.textContent = signedIn ? "Signed in" : "Not signed in";
    }
    if (sidebarAccountName) {
      sidebarAccountName.textContent = signedIn ? profileName : "Account";
    }
    if (sidebarAccountEmail) {
      sidebarAccountEmail.textContent = signedIn ? profileEmail || "Signed in" : "Not signed in";
    }
    if (sidebarAccountAvatar) {
      if (signedIn) {
        sidebarAccountAvatar.src = profileImage;
        sidebarAccountAvatar.alt = `${profileName} profile picture`;
        sidebarAccountAvatar.classList.remove("oz-hidden");
      } else {
        sidebarAccountAvatar.src = "";
        sidebarAccountAvatar.alt = "";
        sidebarAccountAvatar.classList.add("oz-hidden");
      }
    }
    if (accountSignOutBtn) {
      accountSignOutBtn.disabled = !signedIn;
    }
    if (accountSignInBtn) {
      accountSignInBtn.disabled = !cloudOptIn;
    }
    if (accountSyncNowBtn) {
      accountSyncNowBtn.disabled = !cloudOptIn || !signedIn || !cloudSyncEnabled;
    }
    if (accountCloudSyncToggle) {
      accountCloudSyncToggle.disabled = !cloudOptIn || !signedIn;
      accountCloudSyncToggle.checked = cloudOptIn && signedIn && cloudSyncEnabled;
    }
    if (accountCloudOptInHelp) {
      accountCloudOptInHelp.textContent = cloudOptIn
        ? "Sign-in and sync below are available. Turn this off to use the extension without a cloud account."
        : "Turn this on to enable sign-in, sync, and optional reminders while you are not signed in.";
    }
    if (accountCloudSyncHelp) {
      if (!cloudOptIn) {
        accountCloudSyncHelp.textContent =
          "Enable cloud account above to use sync with your signed-in session.";
      } else if (signedIn) {
        accountCloudSyncHelp.textContent =
          "When enabled, settings sync with your account. Turn off to keep changes on this device only.";
      } else {
        accountCloudSyncHelp.textContent =
          "Sign in first. Then you can choose whether to enable cloud sync.";
      }
    }

    try {
      browserApi.storage.local.get({ ozLastSyncedAt: 0 }, (items) => {
        if (accountLastSynced) {
          accountLastSynced.textContent = formatDateTime(items.ozLastSyncedAt || 0);
        }
      });
    } catch (e) {
      if (accountLastSynced) {
        accountLastSynced.textContent = "Never";
      }
    }

    if (status?.claimState === "claimed") {
      setAccountStatus("Sign-in complete.");
    } else if (status?.claimState === "pending") {
      setAccountStatus("Waiting for sign-in confirmation...");
    } else if (status?.claimError) {
      setAccountStatus(status.claimError);
    }
    return status || null;
  }

  function clearAccountStatusPolling() {
    if (accountStatusPollTimer) {
      clearTimeout(accountStatusPollTimer);
      accountStatusPollTimer = null;
    }
  }

  async function pollAccountStatusLoop() {
    const status = await refreshAccountStatus();
    const claimPending = status?.claimState === "pending";
    const signedIn = !!status?.signedIn;

    let delay = ACCOUNT_STATUS_POLL_MEDIUM_MS;
    if (claimPending) {
      delay = ACCOUNT_STATUS_POLL_FAST_MS;
    } else if (signedIn) {
      delay = ACCOUNT_STATUS_POLL_SLOW_MS;
    }

    if (document.visibilityState === "hidden") {
      delay = Math.max(delay, ACCOUNT_STATUS_POLL_SLOW_MS);
    }

    clearAccountStatusPolling();
    accountStatusPollTimer = setTimeout(() => {
      void pollAccountStatusLoop();
    }, delay);
  }

  function saveAllPendingChanges() {
    if (!hasUnsavedChanges || Object.keys(pendingChanges).length === 0) {
      return Promise.resolve({ ok: true, skipped: true });
    }

    if (saveStatus) {
      saveStatus.textContent = "Saving...";
      saveStatus.style.color = "var(--oz-accent)";
    }

    return new Promise((resolve) => {
      try {
        browserApi.storage.sync.set(pendingChanges, () => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            if (saveStatus) {
              saveStatus.textContent = "Save failed";
              saveStatus.style.color = "#ef4444";
            }
            resolve({ ok: false, error: browserApi.runtime.lastError.message || "Save failed." });
            return;
          }

          // Apply changes that need immediate visual updates
          if (pendingChanges.darkModeEnabled !== undefined) {
            const oledEnabled = pendingChanges.oledModeEnabled !== undefined 
              ? pendingChanges.oledModeEnabled 
              : (document.body.classList.contains('oz-oled-mode'));
            applyTheme(pendingChanges.darkModeEnabled, oledEnabled);
            updateThemeUI(pendingChanges.darkModeEnabled);
          }

          if (pendingChanges.oledModeEnabled !== undefined) {
            const darkEnabled = pendingChanges.darkModeEnabled !== undefined
              ? pendingChanges.darkModeEnabled
              : document.body.classList.contains('oz-theme-dark');
            applyTheme(darkEnabled, pendingChanges.oledModeEnabled);
            updateOledUI(pendingChanges.oledModeEnabled);
          }

          if (pendingChanges.accentColor) {
            applyAccentColor(pendingChanges.accentColor);
            updateAccentColorUI(pendingChanges.accentColor);
          }

          markChangesSaved();
          resolve({ ok: true });
        });
      } catch (e) {
        if (saveStatus) {
          saveStatus.textContent = "Save failed";
          saveStatus.style.color = "#ef4444";
        }
        resolve({ ok: false, error: "Save failed." });
      }
    });
  }

  function applyTheme(darkEnabled, oledEnabled = false) {
    const html = document.documentElement;
    const body = document.body;
    if (!html || !body) return;
    if (darkEnabled) {
      html.classList.add("oz-theme-dark");
      body.classList.add("oz-theme-dark");
      if (oledEnabled) {
        html.classList.add("oz-oled-mode");
        body.classList.add("oz-oled-mode");
      } else {
        html.classList.remove("oz-oled-mode");
        body.classList.remove("oz-oled-mode");
      }
    } else {
      html.classList.remove("oz-theme-dark");
      body.classList.remove("oz-theme-dark");
      html.classList.remove("oz-oled-mode");
      body.classList.remove("oz-oled-mode");
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function applyAccentColor(color) {
    const root = document.documentElement;
    if (!root || !color) return;
    
    root.style.setProperty('--oz-accent', color);
    
    const rgb = hexToRgb(color);
    if (rgb) {
      root.style.setProperty('--oz-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    
    const hoverColors = {
      '#6366f1': '#4f46e5',
      '#ec4899': '#db2777',
      '#f97316': '#ea580c',
      '#eab308': '#ca8a04',
      '#10b981': '#059669',
      '#14b8a6': '#0d9488',
      '#3b82f6': '#2563eb'
    };
    
    const hoverColor = hoverColors[color] || color;
    root.style.setProperty('--oz-accent-hover', hoverColor);
    
    const isDark = document.body.classList.contains('oz-theme-dark');
    if (isDark) {
      root.style.setProperty('--oz-accent-muted', `${color}22`);
    } else {
      root.style.setProperty('--oz-accent-muted', `${color}1F`);
    }
  }

  function updateAccentColorUI(color) {
    const normalizedColor = typeof color === "string" ? color.toLowerCase() : "";
    const isCustom = normalizedColor && !PRESET_ACCENT_COLORS.has(normalizedColor);

    accentColorButtons.forEach(btn => {
      const buttonColor = btn.getAttribute("data-color");
      const shouldActivate = isCustom ? buttonColor === "custom" : buttonColor === normalizedColor;
      if (shouldActivate) {
        btn.classList.add('oz-accent-color-active');
      } else {
        btn.classList.remove('oz-accent-color-active');
      }
    });
  }

  function normalizeHexColor(value) {
    const text = String(value || "").trim();
    const withHash = text.startsWith("#") ? text : `#${text}`;
    if (!HEX_COLOR_REGEX.test(withHash)) return null;
    if (withHash.length === 4) {
      return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toLowerCase();
    }
    return withHash.toLowerCase();
  }

  function getCurrentAccentColor() {
    if (pendingChanges.accentColor) {
      return String(pendingChanges.accentColor).toLowerCase();
    }
    return (
      getComputedStyle(document.documentElement).getPropertyValue("--oz-accent").trim().toLowerCase() || "#6366f1"
    );
  }

  function openCustomAccentModal() {
    if (!accentCustomModalOverlay || !accentCustomColorInput) return;
    accentCustomColorInput.value = "";
    accentCustomModalOverlay.classList.remove("oz-hidden");
    accentCustomModalOverlay.setAttribute("aria-hidden", "false");
    if (accentCustomModalError) {
      accentCustomModalError.classList.add("oz-hidden");
    }
    requestAnimationFrame(() => {
      accentCustomColorInput.focus();
      accentCustomColorInput.select();
    });
  }

  function closeCustomAccentModal() {
    if (!accentCustomModalOverlay) return;
    accentCustomModalOverlay.classList.add("oz-hidden");
    accentCustomModalOverlay.setAttribute("aria-hidden", "true");
    if (accentCustomModalError) {
      accentCustomModalError.classList.add("oz-hidden");
    }
  }

  function applyCustomAccentFromModal() {
    if (!accentCustomColorInput) return;
    const normalized = normalizeHexColor(accentCustomColorInput.value);
    if (!normalized) {
      if (accentCustomModalError) {
        accentCustomModalError.classList.remove("oz-hidden");
      }
      return;
    }
    if (accentCustomModalError) {
      accentCustomModalError.classList.add("oz-hidden");
    }
    updatePendingChange("accentColor", normalized);
    applyAccentColor(normalized);
    updateAccentColorUI(normalized);
    closeCustomAccentModal();
  }


  function updateThemeUI(darkEnabled) {
    if (lightModeBtn && darkModeBtn) {
      if (darkEnabled) {
        lightModeBtn.classList.remove('oz-theme-btn-active');
        darkModeBtn.classList.add('oz-theme-btn-active');
      } else {
        lightModeBtn.classList.add('oz-theme-btn-active');
        darkModeBtn.classList.remove('oz-theme-btn-active');
      }
    }
  }

  function updateOledUI(enabled) {
    if (oledEnabledBtn && oledDisabledBtn) {
      if (enabled) {
        oledEnabledBtn.classList.add('oz-oled-btn-active');
        oledDisabledBtn.classList.remove('oz-oled-btn-active');
      } else {
        oledEnabledBtn.classList.remove('oz-oled-btn-active');
        oledDisabledBtn.classList.add('oz-oled-btn-active');
      }
    }
  }

  function setAiTitleEditingStatus(message) {
    setStatus(aiTitleEditingStatusEl, message);
  }

  /** LLM shortcut names require a non-empty Gemini API key in the field (saved or unsaved). */
  function syncAiTitleEditingToggleGate() {
    if (!aiTitleEditingToggle || !geminiInput) return;
    const hasKey = !!geminiInput.value.trim();
    aiTitleEditingToggle.disabled = !hasKey;
    if (!hasKey && aiTitleEditingToggle.checked) {
      aiTitleEditingToggle.checked = false;
      try {
        browserApi.storage.sync.set({ aiTitleEditingEnabled: false }, () => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            return;
          }
          setAiTitleEditingStatus("LLM title editing disabled (add a Gemini API key to enable).");
        });
      } catch (e) {
        // ignore
      }
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
        syncAiTitleEditingToggleGate();
      });
    } catch (e) {
      setGeminiStatus("Could not save Gemini API key.");
    }
  }

  function saveShortcut(shortcut) {
    updatePendingChange('undoShortcut', shortcut);
    shortcutInput.value = formatShortcut(shortcut);
  }

  function saveCommandShortcut(shortcut) {
    updatePendingChange('commandShortcut', shortcut);
    if (commandShortcutInput) {
      commandShortcutInput.value = formatShortcut(shortcut);
    }
  }

  function saveBlockedContentShortcut(shortcut) {
    updatePendingChange('blockedContentShortcut', shortcut);
    if (blockedContentShortcutInput) {
      blockedContentShortcutInput.value = formatShortcut(shortcut);
    }
  }

  function saveSnippetsPageShortcut(shortcut) {
    updatePendingChange("snippetsPageShortcut", shortcut);
    if (snippetsPageShortcutInput) {
      snippetsPageShortcutInput.value = formatShortcut(shortcut);
    }
  }

  function createShortcutHandler(saveFn) {
    return (event) => {
      event.preventDefault();
      event.stopPropagation();

      const key = (event.key || "").toLowerCase();

      const ignoredKeys = [
        "shift",
        "control",
        "alt",
        "meta",
        "capslock",
        "tab"
      ];
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

  function loadCustomShortcuts(callback) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          if (callback) callback();
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        renderCustomShortcuts(shortcuts);
        if (callback) callback();
      });
    } catch (e) {
      // Ignore errors
      if (callback) callback();
    }
  }

  function renderCustomShortcuts(shortcuts) {
    if (!customShortcutsList) return;

    const clearAllBtn = document.getElementById("clearAllCustomShortcuts");
    if (clearAllBtn) {
      clearAllBtn.style.display = shortcuts.length > 0 ? "block" : "none";
    }

    if (shortcuts.length === 0) {
      customShortcutsList.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "oz-help-sub";
      empty.textContent =
        'No custom shortcuts yet. Open the command bar and select "Add custom shortcut", or click "Add manually" above.';
      customShortcutsList.appendChild(empty);
      return;
    }

    customShortcutsList.replaceChildren();

    shortcuts.forEach((customShortcut, index) => {
      const card = document.createElement("div");
      card.style.marginBottom = "20px";
      // Extra right padding to avoid overlap with the top-right delete (×) button
      card.style.padding = "16px 56px 16px 16px";
      card.style.border = "1px solid rgba(148, 163, 184, 0.3)";
      card.style.borderRadius = "8px";
      card.style.backgroundColor = "rgba(249, 250, 251, 0.5)";
      card.className = "oz-custom-shortcut-card";
      card.setAttribute("data-shortcut-id", customShortcut.id);

      // Top-right delete button (removes the custom shortcut)
      const deleteXBtn = document.createElement("button");
      deleteXBtn.className = "oz-button oz-button-ghost oz-custom-shortcut-delete";
      deleteXBtn.type = "button";
      deleteXBtn.textContent = "×";
      deleteXBtn.title = "Delete shortcut";
      deleteXBtn.setAttribute("aria-label", "Delete custom shortcut");
      deleteXBtn.addEventListener("click", () => {
        deleteCustomShortcut(customShortcut.id);
      });
      card.appendChild(deleteXBtn);

      const nameRow = document.createElement("div");
      nameRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      nameRow.style.marginBottom = "12px";

      const nameLabel = document.createElement("label");
      nameLabel.className = "oz-label";
      nameLabel.textContent = "Name:";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "oz-shortcut-input";
      nameInput.placeholder = "Custom shortcut name";
      nameInput.value = customShortcut.description || customShortcut.name || "Custom shortcut";
      nameInput.setAttribute("data-shortcut-id", customShortcut.id);
      nameInput.setAttribute("data-field", "name");

      nameInput.addEventListener("change", () => {
        const newValue = nameInput.value.trim();
        // Save both name and description (they mirror each other)
        saveCustomShortcutField(customShortcut.id, "description", newValue);
      });

      nameRow.appendChild(nameLabel);
      nameRow.appendChild(nameInput);

      const selectorRow = document.createElement("div");
      selectorRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      selectorRow.style.marginBottom = "12px";

      const selectorLabel = document.createElement("label");
      selectorLabel.className = "oz-label";
      selectorLabel.textContent = "Selector:";

      const selectorInput = document.createElement("input");
      selectorInput.type = "text";
      selectorInput.className = "oz-shortcut-input";
      selectorInput.placeholder = "CSS selector (example: button[aria-label='Archive'])";
      selectorInput.value = customShortcut.selector || "";
      selectorInput.setAttribute("data-shortcut-id", customShortcut.id);
      selectorInput.setAttribute("data-field", "selector");

      selectorInput.addEventListener("change", () => {
        const trimmed = selectorInput.value.trim();
        saveCustomShortcutField(customShortcut.id, "selector", trimmed);
      });

      selectorRow.appendChild(selectorLabel);
      selectorRow.appendChild(selectorInput);

      const menuTriggerRow = document.createElement("div");
      menuTriggerRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      menuTriggerRow.style.marginBottom = "12px";

      const menuTriggerLabel = document.createElement("label");
      menuTriggerLabel.className = "oz-label";
      menuTriggerLabel.textContent = "Menu trigger:";

      const menuTriggerInput = document.createElement("input");
      menuTriggerInput.type = "text";
      menuTriggerInput.className = "oz-shortcut-input";
      menuTriggerInput.placeholder =
        "Filled when you pick the control (e.g. ribbon split-button chevron) — or type manually";
      menuTriggerInput.value = customShortcut.menuTriggerSelector || "";
      menuTriggerInput.setAttribute("data-shortcut-id", customShortcut.id);
      menuTriggerInput.setAttribute("data-field", "menuTriggerSelector");

      menuTriggerInput.addEventListener("change", () => {
        const v = menuTriggerInput.value.trim();
        saveCustomShortcutField(customShortcut.id, "menuTriggerSelector", v || null);
      });

      menuTriggerRow.appendChild(menuTriggerLabel);
      menuTriggerRow.appendChild(menuTriggerInput);

      const shortcutRow = document.createElement("div");
      shortcutRow.className = "oz-shortcut-row oz-custom-shortcut-row";
      shortcutRow.style.marginBottom = "12px";

      const shortcutLabel = document.createElement("label");
      shortcutLabel.className = "oz-label";
      shortcutLabel.textContent = "Shortcut:";

      const shortcutInput = document.createElement("input");
      shortcutInput.type = "text";
      shortcutInput.className = "oz-shortcut-input";
      shortcutInput.placeholder = "Press keys…";
      shortcutInput.value = formatShortcut(customShortcut.shortcut);
      shortcutInput.setAttribute("data-shortcut-id", customShortcut.id);

      const clearHotkeyBtn = document.createElement("button");
      clearHotkeyBtn.className = "oz-button oz-button-ghost";
      clearHotkeyBtn.type = "button";
      clearHotkeyBtn.textContent = "Clear hotkey";
      clearHotkeyBtn.addEventListener("click", () => {
        saveCustomShortcut(customShortcut.id, null, { successMessage: "Hotkey cleared." });
        shortcutInput.value = formatShortcut(null);
      });

      shortcutRow.appendChild(shortcutLabel);
      shortcutRow.appendChild(shortcutInput);
      shortcutRow.appendChild(clearHotkeyBtn);

      card.appendChild(nameRow);
      card.appendChild(selectorRow);
      card.appendChild(menuTriggerRow);
      card.appendChild(shortcutRow);

      customShortcutsList.appendChild(card);

      // Add keyboard shortcut handler
      shortcutInput.addEventListener("keydown", createShortcutHandler((shortcut) => {
        saveCustomShortcut(customShortcut.id, shortcut);
        shortcutInput.value = formatShortcut(shortcut);
      }));
      shortcutInput.addEventListener("keyup", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  function saveCustomShortcut(id, shortcut, options = {}) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not save shortcut (storage error).");
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        const index = shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
          shortcuts[index] = { ...shortcuts[index], shortcut };
          browserApi.storage.sync.set({ customShortcuts: shortcuts }, () => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              setCustomStatus("Could not save shortcut (storage error).");
              return;
            }
            const successMessage =
              options && typeof options.successMessage === "string"
                ? options.successMessage
                : shortcut
                  ? "Shortcut saved."
                  : "Hotkey cleared.";
            setCustomStatus(successMessage);
          });
        }
      });
    } catch (e) {
      setCustomStatus("Could not save shortcut.");
    }
  }

  function saveCustomShortcutField(id, field, value) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not save (storage error).");
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        const index = shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
          // Description mirrors the name - when name changes, description updates
          shortcuts[index] = { ...shortcuts[index], [field]: value };
          browserApi.storage.sync.set({ customShortcuts: shortcuts }, () => {
            if (browserApi.runtime && browserApi.runtime.lastError) {
              setCustomStatus("Could not save (storage error).");
              return;
            }
            if (field === "selector") {
              setCustomStatus("Selector saved.");
            } else if (field === "menuTriggerSelector") {
              setCustomStatus("Menu trigger saved.");
            } else {
              setCustomStatus("Name saved.");
            }
          });
        }
      });
    } catch (e) {
      setCustomStatus("Could not save.");
    }
  }

  function clearAllCustomShortcuts() {
    if (!confirm("Are you sure you want to delete all custom shortcuts? This action cannot be undone.")) {
      return;
    }
    
    try {
      browserApi.storage.sync.set({ customShortcuts: [] }, () => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not clear shortcuts (storage error).");
          return;
        }
        loadCustomShortcuts();
        setCustomStatus("All shortcuts cleared.");
      });
    } catch (e) {
      setCustomStatus("Could not clear shortcuts.");
    }
  }

  function deleteCustomShortcut(id) {
    try {
      browserApi.storage.sync.get({ customShortcuts: [] }, (items) => {
        if (browserApi.runtime && browserApi.runtime.lastError) {
          setCustomStatus("Could not delete shortcut (storage error).");
          return;
        }
        const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
        const filtered = shortcuts.filter(s => s.id !== id);
        browserApi.storage.sync.set({ customShortcuts: filtered }, () => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            setCustomStatus("Could not delete shortcut (storage error).");
            return;
          }
          loadCustomShortcuts();
          setCustomStatus("Shortcut deleted.");
        });
      });
    } catch (e) {
      setCustomStatus("Could not delete shortcut.");
    }
  }

  function addManualCustomShortcut() {
    try {
      browserApi.storage.sync.get(
        {
          customShortcuts: [],
          [MANUAL_SHORTCUT_WARNING_KEY]: false
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            setCustomStatus("Could not add shortcut (storage error).");
            return;
          }

          const shortcuts = Array.isArray(items.customShortcuts) ? items.customShortcuts : [];
          const hasShownWarning = !!items[MANUAL_SHORTCUT_WARNING_KEY];

          if (!hasShownWarning) {
            alert(
              "Manual custom shortcuts are an advanced feature. Use valid CSS selectors and test carefully."
            );
          }

          const newShortcut = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            selector: "",
            description: "Manual shortcut",
            shortcut: null,
            menuTriggerSelector: null
          };

          const nextShortcuts = [...shortcuts, newShortcut];
          browserApi.storage.sync.set(
            {
              customShortcuts: nextShortcuts,
              [MANUAL_SHORTCUT_WARNING_KEY]: true
            },
            () => {
              if (browserApi.runtime && browserApi.runtime.lastError) {
                setCustomStatus("Could not add shortcut (storage error).");
                return;
              }
              loadCustomShortcuts(() => {
                const card = document.querySelector(
                  `.oz-custom-shortcut-card[data-shortcut-id="${newShortcut.id}"]`
                );
                if (card) {
                  card.scrollIntoView({ behavior: "smooth", block: "center" });
                  const nameInput = card.querySelector('input[data-field="name"]');
                  if (nameInput && typeof nameInput.focus === "function") {
                    nameInput.focus();
                    if (typeof nameInput.select === "function") {
                      nameInput.select();
                    }
                  }
                }
              });
              setCustomStatus("Manual shortcut created.");
            }
          );
        }
      );
    } catch (e) {
      setCustomStatus("Could not add shortcut.");
    }
  }

  function restoreOptions() {
    try {
      browserApi.storage.sync.get(
        {
          undoShortcut: DEFAULT_UNDO_SHORTCUT,
          commandShortcut: DEFAULT_COMMAND_SHORTCUT,
          blockedContentShortcut: DEFAULT_BLOCKED_CONTENT_SHORTCUT,
          snippetsPageShortcut: DEFAULT_SNIPPETS_PAGE_SHORTCUT,
          vimEnabled: true,
          darkModeEnabled: true,
          oledModeEnabled: false,
          accentColor: '#6366f1',
          popupOpacity: 95,
          backdropBlurEnabled: true,
          inboxZeroEnabled: true,
          archivePopupEnabled: true,
          archiveListMotionReduced: false,
          vimSmoothNavigationEnabled: true,
          geminiApiKey: "",
          customShortcuts: [],
          aiTitleEditingEnabled: true,
          [INBOX_ZERO_STREAK_KEY]: {
            days: 0,
            lastHitDate: null,
            lastOverlayDate: null
          }
        },
        (items) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            shortcutInput.value = formatShortcut(DEFAULT_UNDO_SHORTCUT);
            return;
          }
          const shortcut = (items && items.undoShortcut) || DEFAULT_UNDO_SHORTCUT;
          shortcutInput.value = formatShortcut(shortcut);

          if (commandShortcutInput) {
            const cmdShortcut =
              (items && items.commandShortcut) || DEFAULT_COMMAND_SHORTCUT;
            commandShortcutInput.value = formatShortcut(cmdShortcut);
          }

          if (blockedContentShortcutInput) {
            const blockedShortcut =
              (items && items.blockedContentShortcut) || DEFAULT_BLOCKED_CONTENT_SHORTCUT;
            blockedContentShortcutInput.value = formatShortcut(blockedShortcut);
          }

          if (snippetsPageShortcutInput) {
            const sp =
              (items && items.snippetsPageShortcut) || DEFAULT_SNIPPETS_PAGE_SHORTCUT;
            snippetsPageShortcutInput.value = formatShortcut(sp);
          }

          if (vimToggle) {
            const enabled =
              items && typeof items.vimEnabled === "boolean"
                ? items.vimEnabled
                : true;
            vimToggle.checked = enabled;
          }

          const darkEnabled =
            items && typeof items.darkModeEnabled === "boolean"
              ? items.darkModeEnabled
              : true;
          const oledEnabled =
            items && typeof items.oledModeEnabled === "boolean"
              ? items.oledModeEnabled
              : true;
          
          updateThemeUI(darkEnabled);
          updateOledUI(oledEnabled);
          applyTheme(darkEnabled, oledEnabled);

          const accentColor = (items && items.accentColor) || '#6366f1';
          applyAccentColor(accentColor);
          updateAccentColorUI(accentColor);

          const popupOpacity = (items && typeof items.popupOpacity === "number") 
            ? items.popupOpacity 
            : 95;
          if (popupOpacitySlider) {
            popupOpacitySlider.value = popupOpacity;
          }
          if (popupOpacityValue) {
            popupOpacityValue.textContent = popupOpacity + "%";
          }

          const backdropBlurEnabled = (items && typeof items.backdropBlurEnabled === "boolean")
            ? items.backdropBlurEnabled
            : true;
          if (backdropBlurToggle) {
            backdropBlurToggle.checked = backdropBlurEnabled;
          }

          const inboxZeroEnabled =
            items && typeof items.inboxZeroEnabled === "boolean"
              ? items.inboxZeroEnabled
              : false;
          if (inboxZeroToggle) {
            inboxZeroToggle.checked = inboxZeroEnabled;
          }

          const archivePopupEnabled =
            items && typeof items.archivePopupEnabled === "boolean"
              ? items.archivePopupEnabled
              : true;
          if (archivePopupToggle) {
            archivePopupToggle.checked = archivePopupEnabled;
          }

          const archiveListMotionReduced =
            items && typeof items.archiveListMotionReduced === "boolean"
              ? items.archiveListMotionReduced
              : false;
          if (archiveListMotionToggle) {
            archiveListMotionToggle.checked = archiveListMotionReduced;
          }

          const vimSmoothNavigationEnabled =
            items && typeof items.vimSmoothNavigationEnabled === "boolean"
              ? items.vimSmoothNavigationEnabled
              : true;
          if (vimSmoothNavigationToggle) {
            vimSmoothNavigationToggle.checked = vimSmoothNavigationEnabled;
          }

          const geminiKey = (items && items.geminiApiKey) || "";
          if (geminiInput) {
            geminiInput.value = geminiKey;
          }

          const hasGeminiKey = !!String(geminiKey).trim();
          const storedAiTitleEditing =
            items && typeof items.aiTitleEditingEnabled === "boolean"
              ? items.aiTitleEditingEnabled
              : true;
          if (aiTitleEditingToggle) {
            aiTitleEditingToggle.disabled = !hasGeminiKey;
            aiTitleEditingToggle.checked = hasGeminiKey && storedAiTitleEditing;
            if (!hasGeminiKey && storedAiTitleEditing) {
              browserApi.storage.sync.set({ aiTitleEditingEnabled: false }, () => {});
            }
          }

          loadCustomShortcuts();
          updateStatsFromStorage(items);
          renderAchievementsFromStorage();
          markChangesSaved();
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

  function clearBlockedContentShortcut() {
    const emptyShortcut = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: ""
    };
    saveBlockedContentShortcut(emptyShortcut);
  }

  function clearSnippetsPageShortcut() {
    const emptyShortcut = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: ""
    };
    saveSnippetsPageShortcut(emptyShortcut);
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
    commandShortcutInput.addEventListener(
      "keydown",
      createShortcutHandler(saveCommandShortcut)
    );
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

  if (clearBlockedContentBtn) {
    clearBlockedContentBtn.addEventListener("click", clearBlockedContentShortcut);
  }

  if (blockedContentShortcutInput) {
    blockedContentShortcutInput.addEventListener(
      "keydown",
      createShortcutHandler(saveBlockedContentShortcut)
    );
    blockedContentShortcutInput.addEventListener("keyup", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  if (snippetsPageShortcutInput) {
    snippetsPageShortcutInput.addEventListener(
      "keydown",
      createShortcutHandler(saveSnippetsPageShortcut)
    );
    snippetsPageShortcutInput.addEventListener("keyup", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  if (clearSnippetsPageShortcutBtn) {
    clearSnippetsPageShortcutBtn.addEventListener("click", clearSnippetsPageShortcut);
  }

  if (vimToggle) {
    vimToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      updatePendingChange('vimEnabled', !!target.checked);
    });
  }

  if (vimSmoothNavigationToggle) {
    vimSmoothNavigationToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      updatePendingChange("vimSmoothNavigationEnabled", !!target.checked);
    });
  }

  if (archiveListMotionToggle) {
    archiveListMotionToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      updatePendingChange("archiveListMotionReduced", !!target.checked);
    });
  }

  if (lightModeBtn) {
    lightModeBtn.addEventListener("click", () => {
      updatePendingChange('darkModeEnabled', false);
      updateThemeUI(false);
      const oledEnabled = oledEnabledBtn && oledEnabledBtn.classList.contains('oz-oled-btn-active');
      applyTheme(false, oledEnabled);
    });
  }

  if (darkModeBtn) {
    darkModeBtn.addEventListener("click", () => {
      updatePendingChange('darkModeEnabled', true);
      updateThemeUI(true);
      const oledEnabled = oledEnabledBtn && oledEnabledBtn.classList.contains('oz-oled-btn-active');
      applyTheme(true, oledEnabled);
    });
  }

  if (oledEnabledBtn) {
    oledEnabledBtn.addEventListener("click", () => {
      updatePendingChange('oledModeEnabled', true);
      updateOledUI(true);
      const darkEnabled = darkModeBtn && darkModeBtn.classList.contains('oz-theme-btn-active');
      applyTheme(darkEnabled, true);
    });
  }

  if (oledDisabledBtn) {
    oledDisabledBtn.addEventListener("click", () => {
      updatePendingChange('oledModeEnabled', false);
      updateOledUI(false);
      const darkEnabled = darkModeBtn && darkModeBtn.classList.contains('oz-theme-btn-active');
      applyTheme(darkEnabled, false);
    });
  }

  accentColorButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.getAttribute("data-color");
      if (color === "custom") {
        openCustomAccentModal();
        return;
      }
      if (color) {
        updatePendingChange('accentColor', color);
        applyAccentColor(color);
        updateAccentColorUI(color);
      }
    });
  });

  if (accentCustomModalApply) {
    accentCustomModalApply.addEventListener("click", () => {
      applyCustomAccentFromModal();
    });
  }

  if (accentCustomModalCancel) {
    accentCustomModalCancel.addEventListener("click", () => {
      closeCustomAccentModal();
    });
  }

  if (accentCustomModalClose) {
    accentCustomModalClose.addEventListener("click", () => {
      closeCustomAccentModal();
    });
  }

  if (accentCustomColorInput) {
    accentCustomColorInput.addEventListener("input", () => {
      if (accentCustomModalError) {
        accentCustomModalError.classList.add("oz-hidden");
      }
    });
    accentCustomColorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomAccentFromModal();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeCustomAccentModal();
      }
    });
  }

  if (accentCustomModalOverlay) {
    accentCustomModalOverlay.addEventListener("click", (e) => {
      if (e.target === accentCustomModalOverlay) {
        closeCustomAccentModal();
      }
    });
  }

  if (popupOpacitySlider) {
    popupOpacitySlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value, 10);
      if (popupOpacityValue) {
        popupOpacityValue.textContent = value + "%";
      }
    });

    popupOpacitySlider.addEventListener("change", (e) => {
      const value = parseInt(e.target.value, 10);
      updatePendingChange('popupOpacity', value);
    });
  }

  if (backdropBlurToggle) {
    backdropBlurToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      updatePendingChange('backdropBlurEnabled', !!target.checked);
    });
  }

  if (inboxZeroToggle) {
    inboxZeroToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      updatePendingChange('inboxZeroEnabled', !!target.checked);
    });
  }

  if (archivePopupToggle) {
    archivePopupToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      updatePendingChange('archivePopupEnabled', !!target.checked);
    });
  }

  if (aiTitleEditingToggle) {
    aiTitleEditingToggle.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      if (target.disabled) {
        return;
      }
      updatePendingChange('aiTitleEditingEnabled', !!target.checked);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const saveResult = await saveAllPendingChanges();
      if (!saveResult || !saveResult.ok) {
        return;
      }

      const cloudOptIn = await readCloudAccountOptIn();
      if (!cloudOptIn) {
        setAccountStatus("Saved locally.");
        return;
      }

      const pushResult = await runtimeMessage({ type: "oz-sync-push" });
      if (pushResult && pushResult.ok) {
        setAccountStatus("Saved locally and pushed to cloud.");
      } else if (pushResult && pushResult.error && pushResult.error !== "Not signed in.") {
        setAccountStatus(`Saved locally. Cloud push failed: ${pushResult.error}`);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetAllPendingChanges();
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
    geminiInput.addEventListener("input", () => {
      syncAiTitleEditingToggleGate();
    });
    geminiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        saveGeminiApiKey(geminiInput.value.trim());
      }
    });
  }

  if (accountSignInBtn) {
    accountSignInBtn.addEventListener("click", async () => {
      const panelPrimeSucceeded = await openZeroSidePanelBestEffort();
      let result = await runtimeMessage({ type: "oz-auth-open-signin", preferTab: false });
      result = await applyChromeHostedSidePanelFromSettings(result, panelPrimeSucceeded);
      if (result && result.ok) {
        const hint =
          result.window === "tab"
            ? "Opened sign-in in a new tab. Complete sign-in, then return here."
            : result.window === "sidepanel"
              ? "Opened sign-in in the browser sidebar. Complete sign-in, then return here."
              : "Sign-in window opened. Complete sign-in, then return here.";
        setAccountStatus(hint);
      } else {
        setAccountStatus((result && result.error) || "Could not open sign-in.");
      }
      refreshAccountStatus();
    });
  }

  if (accountCloudOptInToggle) {
    accountCloudOptInToggle.addEventListener("change", async (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      const on = !!target.checked;
      if (!on) {
        try {
          await applyCloudAccountOptOut();
        } catch (err) {
          target.checked = true;
          setAccountStatus("Could not turn off cloud account.");
        }
        return;
      }
      try {
        await new Promise((resolve, reject) => {
          try {
            browserApi.storage.local.set({ [CLOUD_ACCOUNT_OPT_IN_KEY]: true }, () => {
              if (browserApi.runtime && browserApi.runtime.lastError) {
                reject(new Error(browserApi.runtime.lastError.message));
                return;
              }
              resolve();
            });
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        target.checked = false;
        setAccountStatus("Could not enable cloud account.");
        return;
      }
      setAccountStatus("Cloud account enabled. You can sign in and sync below.");
      await refreshAccountStatus();
    });
  }

  if (accountCloudSyncToggle) {
    accountCloudSyncToggle.addEventListener("change", async (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      const enabled = !!target.checked;
      const result = await runtimeMessage({ type: "oz-set-cloud-sync-enabled", enabled });
      if (!result || !result.ok) {
        target.checked = !enabled;
        setAccountStatus((result && result.error) || "Could not update cloud sync.");
      } else {
        setAccountStatus(
          enabled
            ? "Cloud sync enabled."
            : "Cloud sync disabled. Changes stay on this device until you enable sync again."
        );
      }
      refreshAccountStatus();
    });
  }

  if (accountSignOutBtn) {
    accountSignOutBtn.addEventListener("click", async () => {
      const panelPrimeSucceeded = await openZeroSidePanelBestEffort();
      const result = await runtimeMessage({
        type: "oz-auth-signout",
        clerkLogout: true
      });
      if (result && result.ok && result.needsExtensionSidePanelOpen) {
        if (!panelPrimeSucceeded) {
          const openedAgain = await openZeroSidePanelBestEffort();
          if (!openedAgain) {
            await runtimeMessage({ type: "oz-auth-open-stored-hosted-url" });
          }
        }
      }
      if (result && result.ok) {
        setAccountStatus("Signed out.");
      } else {
        setAccountStatus((result && result.error) || "Could not sign out.");
      }
      await refreshAccountStatus();
    });
  }

  if (accountSyncNowBtn) {
    accountSyncNowBtn.addEventListener("click", async () => {
      openSyncNowModal();
    });
  }

  if (syncNowModalClose) {
    syncNowModalClose.addEventListener("click", () => {
      closeSyncNowModal();
    });
  }

  if (syncNowModalCancel) {
    syncNowModalCancel.addEventListener("click", () => {
      closeSyncNowModal();
      setAccountStatus("Sync cancelled.");
    });
  }

  if (syncNowModalOverlay) {
    syncNowModalOverlay.addEventListener("click", (e) => {
      if (e.target === syncNowModalOverlay) {
        closeSyncNowModal();
      }
    });
  }

  if (sidebarVersionLink) {
    sidebarVersionLink.addEventListener("click", () => {
      openAboutInfoModal();
    });
  }

  if (aboutInfoModalClose) {
    aboutInfoModalClose.addEventListener("click", () => {
      closeAboutInfoModal();
    });
  }

  if (aboutInfoModalOverlay) {
    aboutInfoModalOverlay.addEventListener("click", (e) => {
      if (e.target === aboutInfoModalOverlay) {
        closeAboutInfoModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && aboutInfoModalOverlay && !aboutInfoModalOverlay.classList.contains("oz-hidden")) {
      closeAboutInfoModal();
    }
  });

  if (syncNowModalPush) {
    syncNowModalPush.addEventListener("click", async () => {
      closeSyncNowModal();
      const result = await runtimeMessage({ type: "oz-sync-push" });
      if (result && result.ok) {
        try {
          browserApi.storage.local.set({ ozLastSyncedAt: Date.now() }, () => {
            refreshAccountStatus();
          });
        } catch (e) {
          refreshAccountStatus();
        }
        setAccountStatus("Local settings pushed to cloud.");
      } else {
        setAccountStatus((result && result.error) || "Push failed.");
      }
    });
  }

  if (syncNowModalPull) {
    syncNowModalPull.addEventListener("click", async () => {
      closeSyncNowModal();
      const result = await runtimeMessage({
        type: "oz-sync-now",
        overwriteLocal: true
      });
      if (result && result.ok) {
        try {
          browserApi.storage.local.set({ ozLastSyncedAt: Date.now() }, () => {
            refreshAccountStatus();
          });
        } catch (e) {
          refreshAccountStatus();
        }
        setAccountStatus("Cloud settings pulled from DB.");
      } else {
        setAccountStatus((result && result.error) || "Pull failed.");
      }
    });
  }

  function scrollToShortcut(shortcutId) {
    activatePanel("custom");
    loadCustomShortcuts(() => {
      setTimeout(() => {
        const card = document.querySelector(
          '.oz-custom-shortcut-card[data-shortcut-id="' + shortcutId + '"]'
        );
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.transition = "box-shadow 0.3s ease";
          card.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
          setTimeout(() => {
            card.style.boxShadow = "";
          }, 2000);
        }
        browserApi.storage.local.remove("scrollToShortcutId");
      }, 200);
    });
  }

  function initOptionsPageAfterDomReady() {
    // Check if we need to scroll to a specific shortcut BEFORE loading options
    // This way we can wait for shortcuts to load before scrolling
    browserApi.storage.local.get({ scrollToShortcutId: null }, (items) => {
      const shortcutIdToScroll = items.scrollToShortcutId;

      // Load options (which will load shortcuts)
      restoreOptions();

      // If we need to scroll to a shortcut, do it after shortcuts are loaded
      if (shortcutIdToScroll) {
        scrollToShortcut(shortcutIdToScroll);
      }
    });

    // Add clear all button handler
    const clearAllBtn = document.getElementById("clearAllCustomShortcuts");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", clearAllCustomShortcuts);
    }

    if (manualAddCustomShortcutBtn) {
      manualAddCustomShortcutBtn.addEventListener("click", addManualCustomShortcut);
    }

    tabButtons.forEach((tab) => {
      tab.addEventListener("click", () => {
        const panelId = tab.getAttribute("data-panel");
        if (panelId) {
          activatePanel(panelId);
        }
      });
    });

    const activeTab =
      document.querySelector(".oz-tab.oz-tab-active[data-panel]") ||
      document.querySelector(".oz-sidebar-account-tab-active[data-panel]");
    const initialPanelId = activeTab && activeTab.getAttribute("data-panel");
    if (initialPanelId) {
      activatePanel(initialPanelId);
    }

    window.requestAnimationFrame(() => {
      const raw = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
      if (raw === "snippets") {
        const tab = document.querySelector('[data-panel="snippets"]');
        if (tab) {
          /** @type {HTMLElement} */ (tab).click();
        }
      }
    });

    const exportSettingsBtn = document.getElementById("exportSettingsJson");
    if (exportSettingsBtn) {
      exportSettingsBtn.addEventListener("click", exportSettingsAndShortcuts);
    }

    wireImportSettingsUi();
    initAboutInfo();
    void pollAccountStatusLoop();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        clearAccountStatusPolling();
        void pollAccountStatusLoop();
      }
    });
  }

  // Settings HTML is injected by the WXT/React shell after the document may already
  // have fired DOMContentLoaded; run init immediately when the document is ready.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOptionsPageAfterDomReady);
  } else {
    initOptionsPageAfterDomReady();
  }

  // Listen for custom shortcuts changes (e.g., when added from content script)
  try {
    browserApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && !hasUnsavedChanges) {
        restoreOptions();
      }

      if (areaName === "sync" && changes.customShortcuts) {
        loadCustomShortcuts(() => {
          // After shortcuts are loaded, check if we need to scroll to a new one
          browserApi.storage.local.get({ scrollToShortcutId: null }, (items) => {
            if (items.scrollToShortcutId) {
              setTimeout(() => {
                scrollToShortcut(items.scrollToShortcutId);
              }, 200);
            }
          });
        });
      }
      
      if (areaName === "local" && changes[CLOUD_ACCOUNT_OPT_IN_KEY]) {
        void refreshAccountStatus();
      }

      // Also check for scrollToShortcutId in local storage (when a new shortcut is added)
      if (areaName === "local" && changes.scrollToShortcutId) {
        const newShortcutId = changes.scrollToShortcutId.newValue;
        if (newShortcutId) {
          // Load shortcuts first to ensure they're up to date, then scroll
          loadCustomShortcuts(() => {
            setTimeout(() => {
              scrollToShortcut(newShortcutId);
            }, 200);
          });
        }
      }
    });
  } catch (e) {
    // Ignore if storage events are not available
  }
})();