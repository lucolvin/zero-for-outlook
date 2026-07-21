// @ts-nocheck
/**
 * Snippets: chrome.storage.local (fast, large quota) + chrome.storage.sync (cross-profile/device).
 * Sync has ~8 KiB per key and ~100 KiB total — we shard large lists across ozSb_* body keys.
 */
export const OZ_SNIPPETS_KEY = "ozSnippets";
const OZ_SNIPPETS_REV_KEY = "ozSnippetsRev";
const OZ_SNIPPETS_META_KEY = "ozSnippetsMeta";
const OZ_SNIPPETS_BODY_PREFIX = "ozSb_";

/** Stay under sync per-item bytes (UTF-8). */
const MAX_SINGLE_BLOB_UTF8 = 7000;
const MAX_BODY_CHUNK_CHARS = 6000;

function safeBodyKeyPart(id) {
  return String(id).replace(/[^a-z0-9_]/gi, "_").slice(0, 72);
}

function bodyBaseKey(id) {
  return `${OZ_SNIPPETS_BODY_PREFIX}${safeBodyKeyPart(id)}`;
}

function utf8ByteLength(s) {
  try {
    return new TextEncoder().encode(s).length;
  } catch {
    return String(s || "").length * 2;
  }
}

function chunkBodyByChars(body) {
  const b = body == null ? "" : String(body);
  if (b.length <= MAX_BODY_CHUNK_CHARS) return [b];
  const parts = [];
  for (let i = 0; i < b.length; i += MAX_BODY_CHUNK_CHARS) {
    parts.push(b.slice(i, i + MAX_BODY_CHUNK_CHARS));
  }
  return parts;
}

function reconstructRowsFromSyncAll(all) {
  if (!all || typeof all !== "object") return [];
  if (Array.isArray(all[OZ_SNIPPETS_KEY])) {
    return all[OZ_SNIPPETS_KEY];
  }
  const meta = all[OZ_SNIPPETS_META_KEY];
  if (!meta || !Array.isArray(meta.items)) return [];
  return meta.items.map((m) => ({
    id: m.id,
    title: m.title || "",
    sends: typeof m.sends === "number" ? m.sends : 0,
    body: readBodyFromSync(all, m.id)
  }));
}

function readBodyFromSync(all, id) {
  const base = bodyBaseKey(id);
  if (typeof all[base] === "string") return all[base];
  let i = 0;
  const parts = [];
  while (typeof all[`${base}_c${i}`] === "string") {
    parts.push(all[`${base}_c${i}`]);
    i++;
  }
  return parts.join("");
}

/**
 * Keys we set for bodies this save (base and chunk keys).
 */
function collectBodyKeysForRows(rows) {
  /** @type {Set<string>} */
  const keys = new Set();
  for (const r of rows) {
    const base = bodyBaseKey(r.id);
    const parts = chunkBodyByChars(r.body || "");
    if (parts.length <= 1) {
      keys.add(base);
    } else {
      for (let i = 0; i < parts.length; i++) {
        keys.add(`${base}_c${i}`);
      }
    }
  }
  return keys;
}

function buildSyncPayload(rows, rev) {
  const serialized = JSON.stringify(rows);
  /** @type {Record<string, unknown>} */
  const toSet = { [OZ_SNIPPETS_REV_KEY]: rev };

  if (utf8ByteLength(serialized) <= MAX_SINGLE_BLOB_UTF8) {
    toSet[OZ_SNIPPETS_KEY] = rows;
    return { toSet, mode: "single" };
  }

  toSet[OZ_SNIPPETS_META_KEY] = {
    rev,
    items: rows.map((r) => ({
      id: r.id,
      title: r.title || "",
      sends: typeof r.sends === "number" && !Number.isNaN(r.sends) ? r.sends : 0
    }))
  };

  for (const r of rows) {
    const base = bodyBaseKey(r.id);
    const parts = chunkBodyByChars(r.body || "");
    if (parts.length <= 1) {
      toSet[base] = parts[0] || "";
    } else {
      for (let i = 0; i < parts.length; i++) {
        toSet[`${base}_c${i}`] = parts[i];
      }
    }
  }

  return { toSet, mode: "sharded" };
}

function cleanupStaleSyncSnippetKeys(api, mode, bodyKeysToKeep, done) {
  try {
    api.storage.sync.get(null, (all) => {
      if (api.runtime?.lastError || !all) {
        done();
        return;
      }
      const remove = [];
      for (const k of Object.keys(all)) {
        if (k === OZ_SNIPPETS_KEY) {
          if (mode === "sharded") remove.push(k);
          continue;
        }
        if (k === OZ_SNIPPETS_META_KEY) {
          if (mode === "single") remove.push(k);
          continue;
        }
        if (k === OZ_SNIPPETS_REV_KEY) continue;
        if (!k.startsWith(OZ_SNIPPETS_BODY_PREFIX)) continue;
        if (!bodyKeysToKeep.has(k)) remove.push(k);
      }
      if (remove.length) {
        api.storage.sync.remove(remove, () => done());
      } else {
        done();
      }
    });
  } catch {
    done();
  }
}

export function writeSyncFromRows(api, rows, rev, cb) {
  const done = typeof cb === "function" ? cb : () => {};
  const { toSet, mode } = buildSyncPayload(rows, rev);
  const bodyKeys =
    mode === "single" ? new Set() : collectBodyKeysForRows(rows);

  try {
    api.storage.sync.set(toSet, () => {
      if (api.runtime?.lastError) {
        done(api.runtime.lastError);
        return;
      }
      cleanupStaleSyncSnippetKeys(api, mode, bodyKeys, () => done(null));
    });
  } catch (e) {
    done(e);
  }
}

function mergeRowsOnLoad(localRows, localRev, all) {
  const syncRows = reconstructRowsFromSyncAll(all);
  const syncRev = Number(all && all[OZ_SNIPPETS_REV_KEY]) || 0;
  const lr = Array.isArray(localRows) ? localRows : [];
  const lRev = Number(localRev) || 0;

  if (syncRev > lRev) {
    return { rows: syncRows.length > 0 ? syncRows : lr, rev: syncRev };
  }
  if (lRev > syncRev) {
    return { rows: lr, rev: lRev };
  }
  // Same rev or both 0 — prefer non-empty; then local for ties on same machine
  if (lr.length && !syncRows.length) return { rows: lr, rev: lRev || Date.now() };
  if (syncRows.length && !lr.length) return { rows: syncRows, rev: syncRev || Date.now() };
  if (syncRows.length && lr.length) return { rows: lr, rev: lRev || syncRev || Date.now() };
  return { rows: lr.length ? lr : syncRows, rev: lRev || syncRev || Date.now() };
}

export function loadOzSnippets(api, cb) {
  const done = typeof cb === "function" ? cb : () => {};
  try {
    api.storage.local.get([OZ_SNIPPETS_KEY, OZ_SNIPPETS_REV_KEY], (lw) => {
      if (api.runtime?.lastError) {
        done([]);
        return;
      }
      const localRows = lw[OZ_SNIPPETS_KEY];
      const localRev = lw[OZ_SNIPPETS_REV_KEY];

      api.storage.sync.get(null, (all) => {
        if (api.runtime?.lastError) {
          const rows = Array.isArray(localRows) ? localRows : [];
          done(rows);
          return;
        }

        const { rows, rev } = mergeRowsOnLoad(localRows, localRev, all);

        api.storage.local.set({ [OZ_SNIPPETS_KEY]: rows, [OZ_SNIPPETS_REV_KEY]: rev }, () => {
          done(rows);
          // If sync had no snippet data but local did (e.g. first save after migration), backfill sync.
          const syncRev = Number(all && all[OZ_SNIPPETS_REV_KEY]) || 0;
          const syncHas =
            (Array.isArray(all[OZ_SNIPPETS_KEY]) && all[OZ_SNIPPETS_KEY].length > 0) ||
            (all[OZ_SNIPPETS_META_KEY] &&
              Array.isArray(all[OZ_SNIPPETS_META_KEY].items) &&
              all[OZ_SNIPPETS_META_KEY].items.length > 0);
          if (rows.length && !syncHas && rev) {
            writeSyncFromRows(api, rows, rev, () => {});
          }
        });
      });
    });
  } catch {
    done([]);
  }
}

export function saveOzSnippets(api, rows, cb) {
  const done = typeof cb === "function" ? cb : () => {};
  const rev = Date.now();
  try {
    api.storage.local.set(
      { [OZ_SNIPPETS_KEY]: rows, [OZ_SNIPPETS_REV_KEY]: rev },
      () => {
        if (api.runtime?.lastError) {
          done(api.runtime.lastError);
          return;
        }
        writeSyncFromRows(api, rows, rev, (err) => done(err || null));
      }
    );
  } catch (e) {
    done(e);
  }
}

function syncChangeRelevant(keys) {
  return keys.some(
    (k) =>
      k === OZ_SNIPPETS_KEY ||
      k === OZ_SNIPPETS_REV_KEY ||
      k === OZ_SNIPPETS_META_KEY ||
      k.startsWith(OZ_SNIPPETS_BODY_PREFIX)
  );
}

/**
 * Pull newer data from sync into local and notify (caller ensures debounce for sharded writes).
 */
function pullSyncIntoLocal(api, onRows) {
  api.storage.local.get([OZ_SNIPPETS_KEY, OZ_SNIPPETS_REV_KEY], (lw) => {
    if (api.runtime?.lastError) return;
    api.storage.sync.get(null, (all) => {
      if (api.runtime?.lastError) return;
      const syncRev = Number(all && all[OZ_SNIPPETS_REV_KEY]) || 0;
      const prevRev = Number(lw && lw[OZ_SNIPPETS_REV_KEY]) || 0;
      if (syncRev <= prevRev) return;
      const rows = reconstructRowsFromSyncAll(all);
      api.storage.local.set(
        { [OZ_SNIPPETS_KEY]: rows, [OZ_SNIPPETS_REV_KEY]: syncRev },
        () => onRows(rows)
      );
    });
  });
}

/** Subscribe to snippet list changes (local + sync). */
export function watchOzSnippets(api, onRows) {
  const notify = (v) => {
    onRows(Array.isArray(v) ? v : []);
  };
  let syncPullTimer = null;
  const localFn = (changes, area) => {
    if (area !== "local" || !changes[OZ_SNIPPETS_KEY]) return;
    notify(changes[OZ_SNIPPETS_KEY].newValue);
  };
  const syncFn = (changes, area) => {
    if (area !== "sync") return;
    if (!syncChangeRelevant(Object.keys(changes))) return;
    if (syncPullTimer) clearTimeout(syncPullTimer);
    syncPullTimer = setTimeout(() => {
      syncPullTimer = null;
      pullSyncIntoLocal(api, notify);
    }, 160);
  };
  try {
    api.storage.onChanged.addListener(localFn);
    api.storage.onChanged.addListener(syncFn);
    return () => {
      if (syncPullTimer) clearTimeout(syncPullTimer);
      api.storage.onChanged.removeListener(localFn);
      api.storage.onChanged.removeListener(syncFn);
    };
  } catch {
    return () => {};
  }
}
