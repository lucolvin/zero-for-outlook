// @ts-nocheck
// Type `;` in compose to pick a snippet (Superhuman-style). Replaces `;` + optional filter with snippet body.
// Uses composedPath() so typing inside Shadow DOM editors still resolves the compose host.

import { getCachedSnippets, snippetBodyPlainPreview } from "./snippets.ts";
import {
  replaceLastCharsInContentEditable,
  replaceLastCharsInTextControl,
  findComposeSurfaceFromNode,
  isRecipientOrSubjectField,
  isZeroExtensionOverlayElement
} from "./snippetInsert.ts";
import { isCommandOverlayOpen } from "./commandBar.ts";
import { isElementPickerActive } from "./elementPicker.ts";
import { isSummaryOverlayOpen } from "./summary.ts";
import { isSnoozeOverlayOpen } from "./snooze.ts";
import { recordSnippetInserted } from "./achievements.ts";
import { expandSnippetVariables, buildComposeSnippetContext } from "./snippetVariables.ts";

const STYLE_ID = "oz-snippet-inline-style";

let overlay = null;
let listEl = null;
let activeHost = null;
let activeKind = null; // "ce" | "ta"
let triggerLen = 0;
let filtered = [];
let selectedIndex = 0;
let rafCheck = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.oz-snippet-inline-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483640;
  background: transparent;
}
.oz-snippet-inline-pop {
  position: fixed;
  z-index: 2147483641;
  min-width: 320px;
  max-width: min(560px, 92vw);
  max-height: min(320px, 40vh);
  overflow: auto;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #0f172a;
  color: #e5e7eb;
  box-shadow: 0 16px 40px rgba(0,0,0,0.45);
  font: 13px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.oz-snippet-inline-row {
  display: grid;
  grid-template-columns: minmax(100px, 0.35fr) 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(51, 65, 85, 0.9);
}
.oz-snippet-inline-row:last-child { border-bottom: none; }
.oz-snippet-inline-row.oz-snippet-inline-sel {
  background: rgba(59, 130, 246, 0.22);
}
.oz-snippet-inline-name { font-weight: 600; color: #f8fafc; }
.oz-snippet-inline-preview { color: #94a3b8; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oz-snippet-inline-owner { color: #64748b; font-size: 11px; text-align: right; }
.oz-snippet-inline-hint {
  padding: 8px 12px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid rgba(51, 65, 85, 0.9);
}
`;
  document.documentElement.appendChild(s);
}

function resolveComposeContentHost(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = /** @type {HTMLElement} */ (node);
  if (isZeroExtensionOverlayElement(el)) return null;
  if (!findComposeSurfaceFromNode(el)) return null;

  if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
    if (isRecipientOrSubjectField(el)) return null;
    return el;
  }

  const host =
    el.isContentEditable && el.isContentEditable !== "false"
      ? el
      : el.closest && el.closest('[contenteditable="true"]');
  if (!host) return null;
  if (isRecipientOrSubjectField(host)) return null;
  return /** @type {HTMLElement} */ (host);
}

function pickHostFromComposedPath(e) {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
  for (const n of path) {
    const h = resolveComposeContentHost(n);
    if (h) return h;
  }
  return null;
}

function caretAnchorRect(host) {
  if (host.tagName === "TEXTAREA" || (host.tagName === "INPUT" && host.type === "text")) {
    const r = host.getBoundingClientRect();
    return { left: r.left + 10, bottom: r.bottom + 4, top: r.top };
  }
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const rects = sel.getRangeAt(0).getClientRects();
    if (rects && rects.length) {
      const rr = rects[rects.length - 1];
      return { left: rr.left, bottom: rr.bottom, top: rr.top };
    }
  }
  const r = host.getBoundingClientRect();
  return { left: r.left + 8, bottom: r.bottom + 4, top: r.top };
}

function positionPop(host) {
  if (!overlay || !listEl) return;
  const pop = overlay.querySelector(".oz-snippet-inline-pop");
  if (!pop) return;
  const { left, bottom } = caretAnchorRect(host);
  pop.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 340))}px`;
  pop.style.top = `${Math.min(bottom + 6, window.innerHeight - 120)}px`;
}

function hidePicker() {
  if (rafCheck) {
    cancelAnimationFrame(rafCheck);
    rafCheck = null;
  }
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
  overlay = null;
  listEl = null;
  activeHost = null;
  activeKind = null;
  triggerLen = 0;
  filtered = [];
  selectedIndex = 0;
  document.removeEventListener("keydown", onGlobalKeydown, true);
}

function applyFilter(query) {
  const all = getCachedSnippets();
  const q = (query || "").toLowerCase();
  if (!q) return all.slice();
  return all.filter((s) => {
    const t = (s.title || "").toLowerCase();
    const b = (s.body || "").toLowerCase();
    return t.includes(q) || b.includes(q);
  });
}

function renderRows() {
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "oz-snippet-inline-row";
    empty.style.gridTemplateColumns = "1fr";
    empty.textContent = getCachedSnippets().length
      ? "No snippets match. Add snippets in the Snippets manager."
      : "No snippets yet. Open the Snippets manager to add some.";
    listEl.appendChild(empty);
    return;
  }
  filtered.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "oz-snippet-inline-row" + (i === selectedIndex ? " oz-snippet-inline-sel" : "");
    const name = document.createElement("div");
    name.className = "oz-snippet-inline-name";
    name.textContent = s.title || "Untitled";
    const prev = document.createElement("div");
    prev.className = "oz-snippet-inline-preview";
    prev.textContent = snippetBodyPlainPreview(s.body || "").slice(0, 120);
    const own = document.createElement("div");
    own.className = "oz-snippet-inline-owner";
    own.textContent = "Me";
    row.appendChild(name);
    row.appendChild(prev);
    row.appendChild(own);
    row.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pickSnippet(s);
    });
    listEl.appendChild(row);
  });
}

function pickSnippet(s) {
  if (!activeHost || !triggerLen) {
    hidePicker();
    return;
  }
  const surface = findComposeSurfaceFromNode(activeHost);
  const ctx = buildComposeSnippetContext(surface);
  const body = expandSnippetVariables((s && s.body) || "", ctx);
  let ok = false;
  if (activeKind === "ta") {
    ok = replaceLastCharsInTextControl(activeHost, triggerLen, body);
  } else {
    ok = replaceLastCharsInContentEditable(activeHost, triggerLen, body);
  }
  if (ok) {
    recordSnippetInserted();
  }
  hidePicker();
}

function cancelPicker(removeTrigger) {
  if (removeTrigger && activeHost && triggerLen) {
    if (activeKind === "ta") {
      replaceLastCharsInTextControl(activeHost, triggerLen, "");
    } else {
      replaceLastCharsInContentEditable(activeHost, triggerLen, "");
    }
  }
  hidePicker();
}

function onGlobalKeydown(e) {
  if (!overlay) return;
  const k = (e.key || "").toLowerCase();
  if (k === "escape") {
    e.preventDefault();
    e.stopPropagation();
    cancelPicker(true);
    return;
  }
  if (!filtered.length) {
    return;
  }
  if (k === "arrowdown") {
    e.preventDefault();
    e.stopPropagation();
    selectedIndex = Math.min(filtered.length - 1, selectedIndex + 1);
    renderRows();
    positionPop(activeHost);
    return;
  }
  if (k === "arrowup") {
    e.preventDefault();
    e.stopPropagation();
    selectedIndex = Math.max(0, selectedIndex - 1);
    renderRows();
    positionPop(activeHost);
    return;
  }
  if (k === "enter") {
    e.preventDefault();
    e.stopPropagation();
    if (filtered[selectedIndex]) {
      pickSnippet(filtered[selectedIndex]);
    } else {
      hidePicker();
    }
  }
}

function showPicker(host, kind, len, query) {
  ensureStyles();
  hidePicker();
  activeHost = host;
  activeKind = kind;
  triggerLen = len;
  filtered = applyFilter(query);
  selectedIndex = 0;

  const backdrop = document.createElement("div");
  backdrop.className = "oz-snippet-inline-backdrop";
  backdrop.addEventListener("mousedown", (e) => {
    if (e.target === backdrop) {
      cancelPicker(false);
    }
  });

  const pop = document.createElement("div");
  pop.className = "oz-snippet-inline-pop";
  listEl = document.createElement("div");
  const hint = document.createElement("div");
  hint.className = "oz-snippet-inline-hint";
  hint.textContent = "↑↓ choose · Enter insert · Esc cancel (removes ;…)";
  pop.appendChild(listEl);
  pop.appendChild(hint);
  backdrop.appendChild(pop);
  document.documentElement.appendChild(backdrop);
  overlay = backdrop;

  renderRows();
  positionPop(host);
  document.addEventListener("keydown", onGlobalKeydown, true);
}

function textBeforeCaret(host) {
  const sel = window.getSelection();
  if (host.tagName === "TEXTAREA" || (host.tagName === "INPUT" && host.type === "text")) {
    const ta = /** @type {HTMLTextAreaElement | HTMLInputElement} */ (host);
    const end = ta.selectionStart ?? ta.value.length;
    return ta.value.slice(0, end);
  }
  if (!sel || !sel.rangeCount) return "";
  try {
    const r = document.createRange();
    r.selectNodeContents(host);
    r.setEnd(sel.focusNode, sel.focusOffset);
    return r.toString();
  } catch {
    return "";
  }
}

function evaluatePickerState(host) {
  if (
    isCommandOverlayOpen() ||
    isElementPickerActive() ||
    isSummaryOverlayOpen() ||
    isSnoozeOverlayOpen()
  ) {
    hidePicker();
    return;
  }
  const kind =
    host.tagName === "TEXTAREA" || (host.tagName === "INPUT" && host.type === "text") ? "ta" : "ce";
  const before = textBeforeCaret(host);
  const m = before.match(/;([\w-]*)$/);
  if (!m) {
    hidePicker();
    return;
  }
  const trigger = `;${m[1] || ""}`;
  const query = m[1] || "";
  if (overlay && activeHost === host && triggerLen === trigger.length) {
    filtered = applyFilter(query);
    renderRows();
    positionPop(host);
    return;
  }
  showPicker(host, kind, trigger.length, query);
}

function scheduleEvaluate(host) {
  if (rafCheck) cancelAnimationFrame(rafCheck);
  rafCheck = requestAnimationFrame(() => {
    rafCheck = null;
    evaluatePickerState(host);
  });
}

function onInputCapture(e) {
  const host = pickHostFromComposedPath(e);
  if (!host) {
    if (overlay) hidePicker();
    return;
  }
  scheduleEvaluate(host);
}

function onBeforeInputCapture(e) {
  if (e.inputType !== "insertText" && e.inputType !== "insertCompositionText") return;
  const data = e.data || "";
  if (!data.includes(";")) return;
  const host = pickHostFromComposedPath(e);
  if (!host) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scheduleEvaluate(host));
  });
}

export function startSnippetInlinePicker() {
  ensureStyles();
  document.addEventListener("input", onInputCapture, true);
  document.addEventListener("beforeinput", onBeforeInputCapture, true);
  return () => {
    document.removeEventListener("input", onInputCapture, true);
    document.removeEventListener("beforeinput", onBeforeInputCapture, true);
    hidePicker();
  };
}
