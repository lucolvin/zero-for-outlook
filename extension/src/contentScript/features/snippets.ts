// @ts-nocheck
// User-defined text snippets: sync storage + command bar insert + compose/reply fields.

import { loadOzSnippets, watchOzSnippets } from "../../snippetStorage.ts";
import { browserApi } from "../core/browserApi.ts";
import { recordSnippetInserted, recordSnippetSavedCount } from "./achievements.ts";
import { insertSnippetText } from "./snippetInsert.ts";

const KEY = "ozSnippets";

/** Plain-text preview for HTML snippet bodies (command bar, inline picker). */
export function snippetBodyPlainPreview(body) {
  if (!body || typeof body !== "string") return "";
  const d = document.createElement("div");
  d.innerHTML = body;
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
}

let cache = [];
/** @type {(() => void) | null} */
let onSnippetsChanged = null;

export function setSnippetsChangeCallback(cb) {
  onSnippetsChanged = typeof cb === "function" ? cb : null;
}

function notifySnippetsChanged() {
  if (onSnippetsChanged) {
    try {
      onSnippetsChanged();
    } catch {
      // ignore
    }
  }
}

export function loadSnippetsFromStorage() {
  return new Promise((resolve) => {
    try {
      loadOzSnippets(browserApi, (rows) => {
        cache = rows;
        recordSnippetSavedCount(cache.length);
        resolve(cache);
      });
    } catch {
      cache = [];
      resolve(cache);
    }
  });
}

export function getCachedSnippets() {
  return cache;
}

export function getSnippetCommands() {
  return cache.map((s) => ({
    id: `snippet:${s.id}`,
    title: `Insert snippet: ${s.title || "Untitled"}`,
    subtitle: snippetBodyPlainPreview(s.body || "").slice(0, 96),
    action: () => {
      const body = s.body || "";
      // Close the command bar first; Outlook may only restore selection after the next frame(s).
      const attemptInsert = (remaining) => {
        try {
          const ok = insertSnippetText(body);
          if (ok) {
            recordSnippetInserted();
            return;
          }
        } catch {
          // ignore
        }
        if (remaining > 0) {
          window.setTimeout(() => attemptInsert(remaining - 1), 90);
        }
      };
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => attemptInsert(8));
      });
    }
  }));
}

export function insertSnippetAtCaret(text) {
  const ok = insertSnippetText(text);
  if (ok) {
    recordSnippetInserted();
  }
  return ok;
}

export function watchSnippetStorage() {
  try {
    watchOzSnippets(browserApi, (next) => {
      cache = next;
      recordSnippetSavedCount(cache.length);
      notifySnippetsChanged();
    });
  } catch {
    // ignore
  }
}
