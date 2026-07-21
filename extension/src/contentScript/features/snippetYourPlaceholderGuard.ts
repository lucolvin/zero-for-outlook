// @ts-nocheck
// If the message body still contains {your_placeholder}, block Send until the user fills it in.

import {
  findComposeBodyField,
  findComposeSurfaceFromNode,
  getPlainTextFromComposeHost,
  replaceAllPlainInContentEditable,
  replaceAllPlainInTextControl
} from "./snippetInsert.ts";
import { YOUR_PLACEHOLDER, messageContainsYourPlaceholder } from "./snippetVariables.ts";

const STYLE_ID = "oz-snippet-placeholder-style";

let skipNextSendGuard = false;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.oz-snippet-placeholder-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(2, 6, 23, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.oz-snippet-placeholder-modal {
  width: min(420px, 100%);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #0f172a;
  color: #e2e8f0;
  padding: 20px 22px;
  font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  box-shadow: 0 24px 64px rgba(0,0,0,0.45);
}
.oz-snippet-placeholder-title { font-weight: 600; font-size: 16px; margin: 0 0 8px; }
.oz-snippet-placeholder-desc { margin: 0 0 14px; color: #94a3b8; font-size: 13px; }
.oz-snippet-placeholder-input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #020617;
  color: #f8fafc;
  padding: 10px 12px;
  font-size: 14px;
  margin-bottom: 16px;
}
.oz-snippet-placeholder-actions { display: flex; gap: 10px; justify-content: flex-end; }
.oz-snippet-placeholder-btn {
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: transparent;
  color: #e2e8f0;
}
.oz-snippet-placeholder-btn-primary {
  background: #38bdf8;
  border-color: #38bdf8;
  color: #0f172a;
}
`;
  document.documentElement.appendChild(s);
}

function showFillPlaceholderModal() {
  ensureStyles();
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "oz-snippet-placeholder-backdrop";
    const modal = document.createElement("div");
    modal.className = "oz-snippet-placeholder-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "oz-ph-title");

    const title = document.createElement("h2");
    title.className = "oz-snippet-placeholder-title";
    title.id = "oz-ph-title";
    title.textContent = "Fill placeholder";

    const desc = document.createElement("p");
    desc.className = "oz-snippet-placeholder-desc";
    desc.textContent = `Your message still contains ${YOUR_PLACEHOLDER}. Enter the text to use for every occurrence, then continue sending.`;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "oz-snippet-placeholder-input";
    input.placeholder = "Replacement text";
    input.autocomplete = "off";

    const actions = document.createElement("div");
    actions.className = "oz-snippet-placeholder-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "oz-snippet-placeholder-btn";
    cancel.textContent = "Cancel";

    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "oz-snippet-placeholder-btn oz-snippet-placeholder-btn-primary";
    ok.textContent = "Continue";

    function cleanup() {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener("keydown", onKey, true);
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        cleanup();
        resolve(null);
      }
      if (ev.key === "Enter" && (ev.target === ok || ev.target === input)) {
        ev.preventDefault();
        ok.click();
      }
    }

    cancel.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });
    ok.addEventListener("click", () => {
      const v = (input.value || "").trim();
      cleanup();
      resolve(v);
    });

    actions.appendChild(cancel);
    actions.appendChild(ok);
    modal.appendChild(title);
    modal.appendChild(desc);
    modal.appendChild(input);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.documentElement.appendChild(backdrop);
    document.addEventListener("keydown", onKey, true);
    window.setTimeout(() => {
      try {
        input.focus();
      } catch {
        // ignore
      }
    }, 0);
  });
}

function isSendLikeControl(el) {
  if (!el || el.nodeType !== 1) return false;
  const node = el.closest && el.closest("[role=\"button\"], button, a[href]");
  if (!node) return false;
  const t = `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""} ${(node.textContent || "").trim()}`.toLowerCase();
  if (!t.trim()) return false;
  if (t.includes("discard") || t.includes("delete draft")) return false;
  if (t.includes("send later") || t.includes("schedule send")) return false;
  if (t === "send" || t.startsWith("send ") || t.includes("send message") || t.includes("send mail")) {
    return true;
  }
  return false;
}

async function handleSendBlocked(sendEl) {
  const bodyHost = findComposeBodyField();
  if (!bodyHost) return false;
  const surfaceBody = findComposeSurfaceFromNode(bodyHost);
  const surfaceSend = findComposeSurfaceFromNode(sendEl);
  if (!surfaceBody || surfaceBody !== surfaceSend) return false;

  const plain = getPlainTextFromComposeHost(bodyHost);
  if (!messageContainsYourPlaceholder(plain)) return false;

  const value = await showFillPlaceholderModal();
  if (value === null) {
    return;
  }

  const tag = bodyHost.tagName;
  if (tag === "TEXTAREA" || (tag === "INPUT" && bodyHost.type === "text")) {
    replaceAllPlainInTextControl(bodyHost, YOUR_PLACEHOLDER, value);
  } else {
    const host =
      bodyHost.isContentEditable && bodyHost.isContentEditable !== "false"
        ? bodyHost
        : bodyHost.closest && bodyHost.closest('[contenteditable="true"]');
    if (host) {
      replaceAllPlainInContentEditable(host, YOUR_PLACEHOLDER, value);
    }
  }

  skipNextSendGuard = true;
  window.requestAnimationFrame(() => {
    try {
      sendEl.click();
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      skipNextSendGuard = false;
    }, 600);
  });
  return true;
}

function onPointerDownCapture(e) {
  if (skipNextSendGuard) return;
  const sendEl = /** @type {HTMLElement | null} */ (e.target && e.target.closest && e.target.closest("[role=\"button\"], button"));
  if (!sendEl || !isSendLikeControl(sendEl)) return;

  const bodyHost = findComposeBodyField();
  if (!bodyHost) return;
  const plain = getPlainTextFromComposeHost(bodyHost);
  if (!messageContainsYourPlaceholder(plain)) return;

  const surfaceBody = findComposeSurfaceFromNode(bodyHost);
  const surfaceSend = findComposeSurfaceFromNode(sendEl);
  if (!surfaceBody || surfaceBody !== surfaceSend) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  void handleSendBlocked(sendEl);
}

function onKeyDownCapture(e) {
  if (skipNextSendGuard) return;
  if (e.key !== "Enter" || (!e.metaKey && !e.ctrlKey)) return;

  const bodyHost = findComposeBodyField();
  if (!bodyHost) return;
  const plain = getPlainTextFromComposeHost(bodyHost);
  if (!messageContainsYourPlaceholder(plain)) return;

  const surface = findComposeSurfaceFromNode(bodyHost);
  if (!surface) return;
  const ae = document.activeElement;
  if (ae && !surface.contains(ae)) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const candidates = Array.from(surface.querySelectorAll('[role="button"], button'));
  const sendBtn = candidates.find((b) => isSendLikeControl(b));
  if (sendBtn) {
    void handleSendBlocked(/** @type {HTMLElement} */ (sendBtn));
  }
}

export function startSnippetYourPlaceholderSendGuard() {
  ensureStyles();
  document.addEventListener("pointerdown", onPointerDownCapture, true);
  document.addEventListener("keydown", onKeyDownCapture, true);
  return () => {
    document.removeEventListener("pointerdown", onPointerDownCapture, true);
    document.removeEventListener("keydown", onKeyDownCapture, true);
  };
}
