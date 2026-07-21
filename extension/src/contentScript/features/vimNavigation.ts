// @ts-nocheck
// Coalesces rapid vim j/k into one navigation step per animation frame and
// re-anchors focus on the message list when Outlook steals it after moves.

import {
  getMessageRows,
  getCurrentRowIndex,
  focusMessageRow,
  getMessageListContainer,
  scrollActiveMessageRowIntoViewCenter
} from "../core/messageList.ts";
import { moveSelection, sendShiftArrow, moveNavVertical } from "./vimMode.ts";

let rafId = null;
/** @type {{ kind: "list" | "shift" | "sidebar"; dir: "down" | "up" } | null} */
let pending = null;

function scheduleScrollAndRefocusList() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollActiveMessageRowIntoViewCenter();
      const container = getMessageListContainer();
      const ae = document.activeElement;
      if (container && ae && container.contains(ae)) {
        return;
      }
      const rows = getMessageRows();
      const idx = getCurrentRowIndex(rows);
      if (idx >= 0 && rows[idx]) {
        focusMessageRow(rows[idx]);
        scrollActiveMessageRowIntoViewCenter();
      }
    });
  });
}

function flush() {
  rafId = null;
  const job = pending;
  pending = null;
  if (!job) return;
  if (job.kind === "sidebar") {
    moveNavVertical(job.dir === "down" ? "down" : "up");
    return;
  }
  if (job.kind === "shift") {
    sendShiftArrow(job.dir, { skipPostScroll: true });
  } else {
    moveSelection(job.dir, { skipPostScroll: true });
  }
  scheduleScrollAndRefocusList();
}

/**
 * Batches repeated key events into one move per frame (smoother under load).
 * @param {"list" | "shift" | "sidebar"} kind
 * @param {"down" | "up"} dir
 */
export function requestVimVerticalNav(kind, dir) {
  pending = { kind, dir };
  if (rafId != null) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    flush();
  });
}
