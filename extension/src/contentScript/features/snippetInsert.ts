// @ts-nocheck
// Reliable snippet insertion for Outlook compose (contenteditable + textarea).
// Outlook often puts the editor inside Shadow DOM and/or under data-app-section=Compose
// instead of only under role=dialog — closest() must walk shadow hosts.

import { expandSnippetVariables, buildComposeSnippetContext } from "./snippetVariables.ts";

let lastComposeTarget = null;

function snippetPayloadLooksLikeHtml(s) {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  if (t.startsWith("<") && />/.test(t)) return true;
  return /<\s*[a-z][\s\S]*?>/i.test(t);
}

function sanitizeSnippetHtml(html) {
  try {
    const d = document.createElement("div");
    d.innerHTML = html;
    d.querySelectorAll("script,iframe,object,embed").forEach((n) => n.remove());
    d.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        if (name.startsWith("on")) el.removeAttribute(a.name);
        const v = (a.value || "").trim().toLowerCase();
        if (v.startsWith("javascript:") || v.startsWith("data:text/html")) el.removeAttribute(a.name);
      });
    });
    return d.innerHTML;
  } catch {
    return "";
  }
}

function htmlToPlain(html) {
  try {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || d.innerText || "";
  } catch {
    return String(html || "");
  }
}

/**
 * Keep selection range aligned with the browser caret after execCommand / insertNode.
 */
function collapseRangeFromSelection(sel, rng) {
  try {
    if (sel && sel.rangeCount > 0) {
      const nr = sel.getRangeAt(0);
      rng.setStart(nr.startContainer, nr.startOffset);
      rng.collapse(true);
    }
  } catch {
    try {
      rng.collapse(false);
    } catch {
      // ignore
    }
  }
}

/**
 * Insert at `rng` inside `host`. For HTML, prefer execCommand("insertHTML") so Outlook's
 * editor applies the same pipeline as a rich paste; fall back to a template fragment.
 */
function insertPayloadIntoRange(rng, payload, host) {
  if (!rng || payload == null) return;
  const doc = rng.commonAncestorContainer?.ownerDocument || document;
  const view = doc.defaultView || window;

  if (!snippetPayloadLooksLikeHtml(payload)) {
    const tn = doc.createTextNode(String(payload));
    rng.insertNode(tn);
    rng.setStartAfter(tn);
    rng.collapse(true);
    return;
  }

  const clean = sanitizeSnippetHtml(String(payload).trim());
  if (host && doc.execCommand) {
    try {
      host.focus();
      const sel = view.getSelection?.();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(rng);
      }
      if (doc.execCommand("insertHTML", false, clean)) {
        const selAfter = view.getSelection?.();
        collapseRangeFromSelection(selAfter, rng);
        return;
      }
    } catch {
      // fall through to DOM insert
    }
  }

  const tpl = doc.createElement("template");
  tpl.innerHTML = clean;
  const frag = tpl.content;
  const last = frag.lastChild;
  rng.insertNode(frag);
  if (last && last.parentNode) {
    rng.setStartAfter(last);
  } else {
    rng.collapse(false);
  }
  rng.collapse(true);
}

function dispatchSnippetInsertedInput(host, payload) {
  if (!host) return;
  const isHtml = snippetPayloadLooksLikeHtml(payload);
  try {
    if (isHtml) {
      host.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertFromPaste"
        })
      );
    } else {
      host.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: String(payload)
        })
      );
    }
  } catch {
    host.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function isVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** True if this element is part of Zero's own overlays (not Outlook compose). */
export function isZeroExtensionOverlayElement(el) {
  if (!el || !el.closest) return false;
  return !!el.closest(
    [
      ".oz-command-backdrop",
      ".oz-snippet-inline-backdrop",
      ".oz-snooze-backdrop",
      ".oz-summary-backdrop",
      ".oz-element-picker-backdrop",
      ".oz-ai-editing-backdrop",
      ".oz-inbox-zero-backdrop",
      ".oz-snippet-placeholder-backdrop"
    ].join(", ")
  );
}

function fieldLabelHint(el) {
  if (!el) return "";
  return `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""} ${el.getAttribute("name") || ""}`.toLowerCase();
}

export function isRecipientOrSubjectField(el) {
  const lab = fieldLabelHint(el).trim();
  if (!lab) return false;
  return (
    /^to\b/.test(lab) ||
    lab.includes("subject") ||
    /^cc\b/.test(lab) ||
    /^bcc\b/.test(lab) ||
    lab.includes(" recipients")
  );
}

/**
 * Nearest compose / mail modal surface, walking from a node up through shadow roots.
 * (Inside a shadow tree, closest("[role=dialog]") does not see the dialog outside the shadow.)
 */
export function findComposeSurfaceFromNode(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
  let cur = /** @type {HTMLElement} */ (el);
  while (cur) {
    try {
      const hit =
        cur.closest('[role="dialog"]') ||
        cur.closest('[data-app-section*="Compose" i]') ||
        cur.closest('form[aria-label*="compose" i]') ||
        cur.closest('[aria-label*="New message" i]') ||
        null;
      if (hit) return hit;
    } catch {
      // ignore invalid selectors in very old engines
    }
    const root = cur.getRootNode();
    if (root instanceof ShadowRoot) {
      cur = root.host;
    } else {
      break;
    }
  }
  return null;
}

/**
 * First suitable message editor under root, including open shadow subtrees.
 */
function firstVisibleComposeEditorIn(root) {
  if (!root || !root.querySelectorAll) return null;

  const selectors = [
    '[role="textbox"][contenteditable="true"]',
    '[contenteditable="true"][aria-multiline="true"]',
    '[contenteditable="true"][aria-label*="Message body" i]',
    '[contenteditable="true"][aria-label*="message" i]',
    '[contenteditable="true"][aria-label*="Compose" i]',
    "div[contenteditable=\"true\"][role=\"textbox\"]"
  ];

  for (const sel of selectors) {
    let nodes;
    try {
      nodes = root.querySelectorAll(sel);
    } catch {
      continue;
    }
    for (const n of nodes) {
      if (n && n.isContentEditable !== false && !isRecipientOrSubjectField(n) && isVisible(n)) {
        return /** @type {HTMLElement} */ (n);
      }
    }
  }

  let fallback = null;
  try {
    const allCe = root.querySelectorAll('[contenteditable="true"]');
    for (const n of allCe) {
      if (isRecipientOrSubjectField(n) || !isVisible(n)) continue;
      if (!fallback) fallback = /** @type {HTMLElement} */ (n);
    }
  } catch {
    // ignore
  }

  const walkShadows = (r) => {
    let els;
    try {
      els = r.querySelectorAll("*");
    } catch {
      return null;
    }
    for (const el of els) {
      if (el.shadowRoot) {
        for (const sel of selectors) {
          const inner = el.shadowRoot.querySelector(sel);
          if (inner && !isRecipientOrSubjectField(inner) && isVisible(inner)) {
            return /** @type {HTMLElement} */ (inner);
          }
        }
        const deep = firstVisibleComposeEditorIn(el.shadowRoot);
        if (deep) return deep;
      }
    }
    return null;
  };

  return walkShadows(root) || fallback;
}

export function findComposeBodyField() {
  const roots = new Set();
  try {
    for (const d of document.querySelectorAll('[role="dialog"]')) roots.add(d);
    for (const c of document.querySelectorAll('[data-app-section*="Compose" i]')) roots.add(c);
    for (const f of document.querySelectorAll('form[aria-label*="compose" i]')) roots.add(f);
  } catch {
    // ignore
  }

  for (const root of roots) {
    const hit = firstVisibleComposeEditorIn(root);
    if (hit) return hit;
  }

  const body = document.body;
  if (body) {
    const hit = firstVisibleComposeEditorIn(body);
    if (hit && findComposeSurfaceFromNode(hit)) return hit;
  }

  return null;
}

export function startComposeFocusTracking() {
  const fn = (e) => {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
    for (const node of path) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = /** @type {HTMLElement} */ (node);
      if (isZeroExtensionOverlayElement(el)) continue;
      if (!findComposeSurfaceFromNode(el)) continue;
      if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
        if (!isRecipientOrSubjectField(el)) {
          lastComposeTarget = el;
        }
        return;
      }
      const ce =
        el.isContentEditable && el.isContentEditable !== "false"
          ? el
          : el.closest && el.closest('[contenteditable="true"]');
      if (ce && findComposeSurfaceFromNode(ce) && isVisible(ce)) {
        lastComposeTarget = /** @type {HTMLElement} */ (ce);
        return;
      }
    }
  };
  document.addEventListener("focusin", fn, true);
  return () => document.removeEventListener("focusin", fn, true);
}

export function getLastComposeTarget() {
  if (lastComposeTarget && document.contains(lastComposeTarget)) {
    if (findComposeSurfaceFromNode(lastComposeTarget) && !isZeroExtensionOverlayElement(lastComposeTarget)) {
      return lastComposeTarget;
    }
  }
  return null;
}

function insertIntoTextControl(input, text) {
  try {
    input.focus();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const insertText = snippetPayloadLooksLikeHtml(text) ? htmlToPlain(text) : text;
    input.value = before + insertText + after;
    const pos = start + insertText.length;
    input.selectionStart = input.selectionEnd = pos;
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText", data: insertText })
    );
    return true;
  } catch {
    return false;
  }
}

function insertIntoContentEditable(host, text) {
  try {
    host.focus();
    const sel = window.getSelection();
    if (!sel) return false;

    let range = null;
    if (sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }
    if (!range || !host.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(host);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    range = sel.getRangeAt(0);
    if (!host.contains(range.commonAncestorContainer)) {
      return false;
    }

    range.deleteContents();
    insertPayloadIntoRange(range, text, host);
    sel.removeAllRanges();
    sel.addRange(range);

    dispatchSnippetInsertedInput(host, text);
    return true;
  } catch {
    try {
      host.focus();
      const plain = snippetPayloadLooksLikeHtml(text) ? htmlToPlain(text) : text;
      return document.execCommand("insertText", false, plain);
    } catch {
      return false;
    }
  }
}

/**
 * Insert snippet text into the best compose target (last focused compose field, visible body, or active element).
 */
export function insertSnippetText(text) {
  if (!text) return false;

  let el = getLastComposeTarget();

  if (!el) {
    el = findComposeBodyField();
  }

  if (!el) {
    const ae = document.activeElement;
    if (
      ae &&
      ae !== document.body &&
      !isZeroExtensionOverlayElement(ae) &&
      findComposeSurfaceFromNode(ae)
    ) {
      const tag = ae.tagName;
      if (tag === "TEXTAREA" || (tag === "INPUT" && ae.type === "text")) {
        if (!isRecipientOrSubjectField(ae)) el = ae;
      } else if (ae.isContentEditable) {
        el = ae;
      }
    }
  }

  if (!el) {
    el = findComposeBodyField();
  }
  if (!el) return false;

  const surface = findComposeSurfaceFromNode(el);
  const expanded = expandSnippetVariables(text, buildComposeSnippetContext(surface));

  const tag = el.tagName;
  if (tag === "TEXTAREA" || (tag === "INPUT" && el.type === "text")) {
    return insertIntoTextControl(/** @type {HTMLInputElement | HTMLTextAreaElement} */ (el), expanded);
  }

  const host = el.isContentEditable ? el : el.closest && el.closest("[contenteditable=\"true\"]");
  if (!host) return false;
  return insertIntoContentEditable(/** @type {HTMLElement} */ (host), expanded);
}

export function getPlainTextFromComposeHost(host) {
  if (!host) return "";
  if (host.tagName === "TEXTAREA" || (host.tagName === "INPUT" && host.type === "text")) {
    return host.value || "";
  }
  try {
    return host.innerText || "";
  } catch {
    return "";
  }
}

export function replaceAllPlainInContentEditable(host, needle, replacement) {
  if (!host || !needle) return false;
  let changed = false;
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent || "";
    if (t.includes(needle)) {
      n.textContent = t.split(needle).join(replacement);
      changed = true;
    }
  }
  if (changed) {
    try {
      host.dispatchEvent(
        new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertReplacementText" })
      );
    } catch {
      host.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  return changed;
}

export function replaceAllPlainInTextControl(el, needle, replacement) {
  if (!el || !needle) return false;
  const v = el.value || "";
  if (!v.includes(needle)) return false;
  el.value = v.split(needle).join(replacement);
  try {
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
  } catch {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return true;
}

/**
 * Global character offsets (0 = start of `root` text) for a collapsed caret.
 */
function globalCaretCharIndex(root, node, offset) {
  try {
    const r = document.createRange();
    r.selectNodeContents(root);
    r.setEnd(node, offset);
    return r.toString().length;
  } catch {
    return -1;
  }
}

/**
 * Build a DOM range inside `root` covering global text offsets [startIdx, endIdx).
 */
function domRangeForGlobalTextOffsets(root, startIdx, endIdx) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cum = 0;
  let startNode = null;
  let startOff = 0;
  let endNode = null;
  let endOff = 0;
  let n = walker.nextNode();
  while (n) {
    const len = n.textContent.length;
    const nextCum = cum + len;
    if (startNode === null && nextCum > startIdx) {
      startNode = n;
      startOff = Math.max(0, startIdx - cum);
    }
    if (nextCum >= endIdx) {
      endNode = n;
      endOff = Math.max(0, endIdx - cum);
      break;
    }
    cum = nextCum;
    n = walker.nextNode();
  }
  if (!startNode || !endNode) return null;
  const rng = document.createRange();
  rng.setStart(startNode, Math.min(startOff, startNode.textContent.length));
  rng.setEnd(endNode, Math.min(endOff, endNode.textContent.length));
  return rng;
}

/**
 * Replace the last `triggerLen` characters before the caret with `snippetBody` inside a contenteditable `host`.
 */
export function replaceLastCharsInContentEditable(host, triggerLen, snippetBody) {
  if (!host || triggerLen < 1) return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const focusNode = sel.focusNode;
  const focusOff = sel.focusOffset;
  if (!host.contains(focusNode)) return false;

  const endIdx = globalCaretCharIndex(host, focusNode, focusOff);
  if (endIdx < triggerLen) return false;
  const startIdx = endIdx - triggerLen;

  const rng = domRangeForGlobalTextOffsets(host, startIdx, endIdx);
  if (!rng) return false;

  host.focus();
  sel.removeAllRanges();
  sel.addRange(rng);
  rng.deleteContents();
  insertPayloadIntoRange(rng, snippetBody, host);
  sel.removeAllRanges();
  sel.addRange(rng);
  dispatchSnippetInsertedInput(host, snippetBody);
  return true;
}

export function replaceLastCharsInTextControl(el, triggerLen, snippetBody) {
  if (!el || triggerLen < 1) return false;
  try {
    el.focus();
    const end = el.selectionStart ?? el.value.length;
    const start = Math.max(0, end - triggerLen);
    const v = el.value;
    const insertText = snippetPayloadLooksLikeHtml(snippetBody) ? htmlToPlain(snippetBody) : snippetBody;
    el.value = v.slice(0, start) + insertText + v.slice(end);
    el.selectionStart = el.selectionEnd = start + insertText.length;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: insertText }));
    return true;
  } catch {
    return false;
  }
}
