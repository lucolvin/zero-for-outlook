// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadOzSnippets, saveOzSnippets, watchOzSnippets } from "../snippetStorage.ts";
import "./snippetsManager.css";

const MAX = 40;

const api = typeof chrome !== "undefined" ? chrome : browser;

function genId() {
  return `s_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
}

function execFmt(cmd, value = false) {
  try {
    document.execCommand(cmd, false, value);
  } catch {
    // ignore
  }
}

export function SnippetsManagerApp() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const editorRef = useRef(null);

  useEffect(() => {
    loadOzSnippets(api, (r) => setRows(r));
    return watchOzSnippets(api, (v) => setRows(v));
  }, []);

  useEffect(() => {
    if (!modal || !editorRef.current) return;
    editorRef.current.innerHTML = modal.bodyHtml || "";
    editorRef.current.focus();
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setModal(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [modal]);

  const persist = useCallback(() => {
    const cleaned = rows
      .map((s) => ({
        id: s.id || genId(),
        title: (s.title || "").trim(),
        body: s.body || "",
        sends: typeof s.sends === "number" && !Number.isNaN(s.sends) ? s.sends : 0
      }))
      .filter((s) => s.title || (s.body && stripHtml(s.body)));

    if (cleaned.length > MAX) {
      setStatus(`You can save at most ${MAX} snippets.`);
      return;
    }

    saveOzSnippets(api, cleaned, (err) => {
      if (err) {
        setStatus("Saved on this device; browser sync failed (size or quota).");
        setRows(cleaned);
        setTimeout(() => setStatus(""), 4000);
        return;
      }
      setRows(cleaned);
      setStatus("Saved locally and to Chrome sync.");
      setTimeout(() => setStatus(""), 2200);
      try {
        api.runtime?.sendMessage?.({ type: "oz-sync-push" }, () => {});
      } catch {
        // ignore
      }
    });
  }, [rows]);

  const openNew = () => {
    if (rows.length >= MAX) {
      setStatus(`At most ${MAX} snippets.`);
      return;
    }
    const id = genId();
    setDraftTitle("");
    setModal({ id, isNew: true, bodyHtml: "" });
  };

  const openEdit = (row) => {
    setDraftTitle(row.title || "");
    setModal({ id: row.id, isNew: false, bodyHtml: row.body || "" });
  };

  const closeModal = () => setModal(null);

  const saveModal = () => {
    if (!modal) return;
    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : modal.bodyHtml || "";
    const title = draftTitle.trim() || "Untitled";
    if (!title && !stripHtml(bodyHtml)) {
      closeModal();
      return;
    }
    setRows((prev) => {
      const exists = prev.some((r) => r.id === modal.id);
      if (modal.isNew && !exists) {
        return [{ id: modal.id, title, body: bodyHtml, sends: 0 }, ...prev];
      }
      return prev.map((r) => (r.id === modal.id ? { ...r, title, body: bodyHtml } : r));
    });
    closeModal();
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (modal && modal.id === id) closeModal();
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.title || "").toLowerCase().includes(q) ||
        stripHtml(r.body || "").toLowerCase().includes(q) ||
        (r.body || "").toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const toolbarBtn = (label, cmd, val) => (
    <button
      key={label}
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        editorRef.current?.focus();
        execFmt(cmd, val);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="oz-snippets-embed">
      <div className="oz-sn-page">
        <header className="oz-sn-top">
          <div className="oz-sn-top-left">
            <h2 className="oz-sn-title">Snippets</h2>
          </div>
          <div className="oz-sn-top-right">
            <label className="oz-sn-search">
              <span className="oz-visually-hidden">Search snippets</span>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search…"
              />
            </label>
            <button type="button" className="oz-sn-btn-save" onClick={persist}>
              Save &amp; sync
            </button>
          </div>
        </header>

        {status ? <p className="oz-sn-status">{status}</p> : null}

        <section className="oz-sn-section">
          <div className="oz-sn-section-head">
            <span className="oz-sn-section-label">Your snippets</span>
            <button type="button" className="oz-sn-link-btn" onClick={openNew}>
              NEW SNIPPET
            </button>
          </div>
          <p className="oz-sn-hint">
            Use the rich editor for bold, lists, etc. Inserted snippets keep that HTML in Outlook. Variables:{" "}
            <code>{"{first_name}"}</code>, <code>{"{last_name}"}</code>, <code>{"{full_name}"}</code>,{" "}
            <code>{"{sender_first_name}"}</code>, <code>{"{sender_last_name}"}</code>,{" "}
            <code>{"{sender_full_name}"}</code>, <code>{"{your_placeholder}"}</code> (filled when sending).
          </p>
          <div className="oz-sn-table-wrap">
            <div className="oz-sn-table-head">
              <div className="oz-sn-grid">
                <span>Name</span>
                <span>Preview</span>
                <span>Sends</span>
                <span>Opened</span>
                <span>Replied</span>
                <span>Author</span>
                <span aria-hidden />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="oz-sn-empty">
                No snippets yet. Click <strong>NEW SNIPPET</strong>, then <strong>Save &amp; sync</strong> when you are
                done.
              </p>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="oz-sn-table-row oz-sn-grid">
                  <span className="oz-sn-col-name">{r.title || "Untitled"}</span>
                  <span className="oz-sn-col-preview" title={stripHtml(r.body || "")}>
                    {stripHtml(r.body || "").slice(0, 140) || "—"}
                  </span>
                  <span className="oz-sn-stat">{r.sends != null ? r.sends : 0}</span>
                  <span className="oz-sn-dash">—</span>
                  <span className="oz-sn-dash">—</span>
                  <span className="oz-sn-author">Me</span>
                  <div className="oz-sn-actions">
                    <button type="button" className="oz-sn-btn-ghost" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="oz-sn-btn-ghost oz-sn-btn-danger"
                      onClick={() => removeRow(r.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {modal ? (
        <div
          className="oz-sn-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="oz-sn-modal" role="dialog" aria-modal="true" aria-labelledby="oz-sn-modal-h">
            <div className="oz-sn-modal-head">
              <h3 className="oz-sn-modal-title" id="oz-sn-modal-h">
                {modal.isNew ? "New snippet" : "Edit snippet"}
              </h3>
              <label className="oz-visually-hidden" htmlFor="oz-sn-modal-title-in">
                Snippet name
              </label>
              <input
                id="oz-sn-modal-title-in"
                className="oz-sn-modal-title-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Name (shown in command bar)"
              />
            </div>
            <div className="oz-sn-modal-body">
              <div className="oz-sn-modal-label">Message body (rich text)</div>
              <div className="oz-sn-modal-toolbar">
                {toolbarBtn("Bold", "bold")}
                {toolbarBtn("Italic", "italic")}
                {toolbarBtn("Underline", "underline")}
                {toolbarBtn("Bullets", "insertUnorderedList")}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editorRef.current?.focus();
                    const url = window.prompt("Link URL", "https://");
                    if (url) execFmt("createLink", url);
                  }}
                >
                  Link
                </button>
              </div>
              <div className="oz-sn-modal-editor-wrap">
                <div
                  ref={editorRef}
                  className="oz-sn-modal-editor"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Hi {first_name}, …"
                />
              </div>
            </div>
            <div className="oz-sn-modal-foot">
              <button type="button" className="oz-sn-modal-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="oz-sn-modal-primary" onClick={saveModal}>
                Save snippet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
