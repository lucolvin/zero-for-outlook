const SIDE_PANEL_NAV_URL_KEY = "ozSidePanelNavigateUrl";

(() => {
  const api =
    typeof globalThis.browser !== "undefined" && globalThis.browser?.storage?.local?.get
      ? globalThis.browser
      : typeof globalThis.chrome !== "undefined"
        ? globalThis.chrome
        : null;

  const root = document.getElementById("root");

  if (!api?.storage?.local?.get || !root) {
    return;
  }

  let hostedActive = false;
  let closingHostedUi = false;

  /** Panel often opens before the background writes ozSidePanelNavigateUrl; polling covers missed onChanged races. */
  let pollTimer = null;
  let claimPollTimer = null;

  function stopPoll() {
    if (pollTimer != null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function stopClaimPoll() {
    if (claimPollTimer != null) {
      clearInterval(claimPollTimer);
      claimPollTimer = null;
    }
  }

  function invokeGetAuthStatus() {
    const br =
      typeof globalThis.browser !== "undefined" &&
      typeof globalThis.browser.runtime?.sendMessage === "function"
        ? globalThis.browser
        : null;
    if (br?.runtime?.sendMessage) {
      try {
        const out = br.runtime.sendMessage({ type: "oz-auth-get-status" });
        if (out && typeof out.then === "function") {
          return /** @type {Promise<any>} */ (out);
        }
      } catch {
        /* fall through */
      }
    }
    return new Promise((resolve, reject) => {
      try {
        api.runtime.sendMessage({ type: "oz-auth-get-status" }, (response) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message || "runtime message failed"));
            return;
          }
          resolve(response || null);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  function maybeStartHostedAuthClaimPoll() {
    stopClaimPoll();
    const deadline = Date.now() + 15 * 60 * 1000;
    claimPollTimer = setInterval(() => {
      if (!hostedActive || Date.now() > deadline || closingHostedUi) {
        stopClaimPoll();
        return;
      }
      void invokeGetAuthStatus()
        .then((status) => {
          if (closingHostedUi) return;
          if (status && (status.signedIn || status.claimState === "claimed")) {
            stopClaimPoll();
            void closeHostedAuthUiFromSidebar();
          }
        })
        .catch(() => {});
    }, 2200);
  }

  /** Chrome 141+: sidePanel.close. Otherwise window.close or Firefox sidebarAction.close. */
  async function closeHostedAuthUiFromSidebar() {
    if (closingHostedUi) return;
    closingHostedUi = true;
    stopClaimPoll();
    stopPoll();

    hostedActive = false;

    const ch = typeof globalThis.chrome !== "undefined" ? globalThis.chrome : null;

    if (ch?.sidePanel?.close && typeof ch.sidePanel.close === "function") {
      try {
        const win = await new Promise((resolve) => {
          if (typeof ch.windows?.getCurrent === "function") {
            ch.windows.getCurrent((w) => resolve(w ?? null));
          } else resolve(null);
        });
        if (typeof win?.id === "number") {
          await ch.sidePanel.close({ windowId: win.id }).catch(() => {});
        }
        const tab = await new Promise((resolve) => {
          if (typeof ch.tabs?.getCurrent === "function") {
            ch.tabs.getCurrent((t) => resolve(t ?? null));
          } else resolve(null);
        });
        if (typeof tab?.id === "number") {
          await ch.sidePanel.close({ tabId: tab.id }).catch(() => {});
        }
        if (typeof tab?.windowId === "number" && typeof win?.id !== "number") {
          await ch.sidePanel.close({ windowId: tab.windowId }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    }

    try {
      window.close();
    } catch {
      /* ignore */
    }

    try {
      const br = typeof globalThis.browser !== "undefined" ? globalThis.browser : null;
      if (typeof br?.sidebarAction?.close === "function") {
        await br.sidebarAction.close();
      }
    } catch {
      /* ignore */
    }

    closingHostedUi = false;
  }

  try {
    if (typeof api.runtime?.onMessage?.addListener === "function") {
      api.runtime.onMessage.addListener((msg) => {
        if (!msg || msg.type !== "oz-close-hosted-auth-sidebar") {
          return undefined;
        }
        void closeHostedAuthUiFromSidebar();
        return undefined;
      });
    }
  } catch {
    /* ignore */
  }

  function startPollForNavUrl() {
    stopPoll();
    const deadline = Date.now() + 20000;
    pollTimer = setInterval(() => {
      if (Date.now() > deadline) {
        stopPoll();
        return;
      }
      api.storage.local.get([SIDE_PANEL_NAV_URL_KEY], (items) => {
        const raw =
          items && typeof items[SIDE_PANEL_NAV_URL_KEY] === "string" ? items[SIDE_PANEL_NAV_URL_KEY] : "";
        if (raw && /^https?:\/\//i.test(raw.trim())) {
          stopPoll();
          applyStoredUrl(raw);
        }
      });
    }, 120);
  }

  function tabsCreateBestEffort(url) {
    const u =
      typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : "";
    if (!u) return;
    try {
      const b = typeof globalThis.browser !== "undefined" ? globalThis.browser : null;
      if (b?.tabs?.create) {
        void b.tabs.create({ url: u });
        return;
      }
      const c = typeof globalThis.chrome !== "undefined" ? globalThis.chrome : null;
      if (c?.tabs?.create) {
        void c.tabs.create({ url: u });
      }
    } catch {
      /* ignore */
    }
  }

  function showHint(message) {
    stopClaimPoll();
    hostedActive = false;
    root.classList.remove("oz-hosted");
    root.innerHTML = "";
    root.textContent =
      message ||
      "Open Zero for Outlook settings and choose Sign in (or sign out) to use this panel.";
    root.classList.add("visible");
  }

  function showHostedInFrame(urlRaw) {
    const navUrl =
      typeof urlRaw === "string" && /^https?:\/\//i.test(urlRaw.trim()) ? urlRaw.trim() : "";

    root.classList.remove("visible");

    if (!navUrl) {
      showHint(undefined);
      return;
    }

    stopPoll();
    hostedActive = true;
    root.classList.add("oz-hosted");
    root.innerHTML = "";

    let clearedKey = false;
    function clearStoredOnce() {
      if (clearedKey) return;
      clearedKey = true;
      try {
        api.storage.local.remove([SIDE_PANEL_NAV_URL_KEY], () => {
          /* ignore */
        });
      } catch {
        /* ignore */
      }
    }

    const host = document.createElement("div");
    host.className = "oz-hosted-frame-host";

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Zero account");
    iframe.src = navUrl;

    iframe.addEventListener(
      "load",
      () => {
        clearStoredOnce();
      },
      { once: true }
    );

    host.appendChild(iframe);

    const fallback = document.createElement("div");
    fallback.style.cssText =
      "font-size:11px;color:#64748b;padding:4px 8px;text-align:center;border-top:1px solid #e5e7eb;flex-shrink:0;";
    fallback.textContent = "If this stays blank, ";
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = "open in a new tab";
    a.style.cssText = "color:#4f46e5;";
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      tabsCreateBestEffort(navUrl);
    });
    fallback.appendChild(a);
    fallback.appendChild(document.createTextNode("."));

    const box = document.createElement("div");
    box.style.cssText = "display:flex;flex-direction:column;height:100%;width:100%;min-height:0";
    box.appendChild(host);
    box.appendChild(fallback);

    root.appendChild(box);
    maybeStartHostedAuthClaimPoll();
  }

  function applyStoredUrl(payload) {
    if (payload == null || payload === "") {
      return;
    }
    if (typeof payload !== "string") {
      return;
    }
    const s = payload.trim();
    if (!/^https?:\/\//i.test(s)) {
      stopPoll();
      showHint("Sign-in link is unavailable. Try again from Zero settings.");
      return;
    }
    showHostedInFrame(s);
  }

  function readStoredUrl(cb) {
    api.storage.local.get([SIDE_PANEL_NAV_URL_KEY], (items) => {
      const raw =
        items && typeof items[SIDE_PANEL_NAV_URL_KEY] === "string" ? items[SIDE_PANEL_NAV_URL_KEY] : "";
      cb(raw);
    });
  }

  readStoredUrl((raw) => {
    if (raw && /^https?:\/\//i.test(raw.trim())) {
      applyStoredUrl(raw);
      return;
    }
    showHint(undefined);
    startPollForNavUrl();
  });

  try {
    api.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes || !changes[SIDE_PANEL_NAV_URL_KEY]) return;
      const ch = changes[SIDE_PANEL_NAV_URL_KEY];
      if (typeof ch.newValue === "string" && /^https?:\/\//i.test(ch.newValue.trim())) {
        applyStoredUrl(ch.newValue);
        return;
      }
      if (ch.newValue == null || ch.newValue === "") {
        if (hostedActive) return;
        stopPoll();
        showHint(undefined);
      }
    });
  } catch {
    /* ignore */
  }

  window.addEventListener("pageshow", () => {
    if (hostedActive) return;
    readStoredUrl((raw) => {
      if (raw && /^https?:\/\//i.test(raw.trim())) {
        applyStoredUrl(raw);
      }
    });
  });
})();
