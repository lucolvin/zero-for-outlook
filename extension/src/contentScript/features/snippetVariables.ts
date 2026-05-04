// @ts-nocheck
// Snippet placeholders: recipient (To), sender (From), and send-time {your_placeholder}.

export const YOUR_PLACEHOLDER = "{your_placeholder}";

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function emptyPerson() {
  return { firstName: "", lastName: "", fullName: "", email: "" };
}

function titleCaseWord(w) {
  if (!w) return "";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/** "john.doe" / "john_doe" → "John Doe" */
function prettyNameFromEmailLocal(local) {
  if (!local) return "";
  const parts = local.replace(/[+]/g, ".").split(/[._-]+/).filter(Boolean);
  return parts.map(titleCaseWord).join(" ");
}

function splitFirstLast(full) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/** Resolved display name from Outlook To/From pill + optional address from parent aria-label. */
function personFromDisplayNameAndEmail(displayName, email) {
  const out = emptyPerson();
  const name = String(displayName || "").trim();
  if (!name) return out;
  out.fullName = name;
  const { first, last } = splitFirstLast(name);
  out.firstName = first;
  out.lastName = last;
  if (email) {
    const m = String(email).match(EMAIL_RE);
    out.email = m ? m[0].toLowerCase() : String(email).toLowerCase().trim();
  }
  return out;
}

function findEmailNearPill(span) {
  let p = span;
  for (let i = 0; i < 12 && p; i++) {
    const blobs = [
      p.getAttribute?.("aria-label"),
      p.getAttribute?.("title"),
      p.getAttribute?.("data-email"),
      p.getAttribute?.("data-address"),
      p.getAttribute?.("data-address-content")
    ];
    for (const b of blobs) {
      if (!b) continue;
      const m = b.match(EMAIL_RE);
      if (m) return m[0].toLowerCase();
    }
    p = p.parentElement;
  }
  return "";
}

function scorePillAncestorsForRole(span, preferTo) {
  let chain = "";
  let path = span;
  for (let i = 0; i < 16 && path; i++) {
    const cls = (path.getAttribute("class") || "").toLowerCase();
    chain += ` ${fieldLabel(path)} ${path.getAttribute("aria-label") || ""} ${cls}`;
    path = path.parentElement;
  }
  chain = chain.toLowerCase();
  let sc = 0;
  if (preferTo) {
    if (/\bto\b/.test(chain)) sc += 10;
    if (chain.includes("recipient")) sc += 6;
    if (chain.includes("pill") || chain.includes("validpill")) sc += 5;
    if (/\bfrom\b/.test(chain) && !/\bto\b/.test(chain)) sc -= 8;
    if (chain.includes("subject")) sc -= 6;
  } else {
    if (/\bfrom\b/.test(chain) || chain.includes("sender")) sc += 10;
    if (chain.includes("account")) sc += 4;
    if (/\bto\b/.test(chain) && !/\bfrom\b/.test(chain)) sc -= 6;
  }
  return sc;
}

function looksLikePersonDisplayName(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 200) return false;
  EMAIL_RE.lastIndex = 0;
  if (EMAIL_RE.test(t)) return false;
  if (/^[\d\s\-+().]+$/.test(t)) return false;
  return /[a-zA-Z]/.test(t);
}

/**
 * Outlook OWA renders resolved recipients as pills with display text in a span whose class
 * contains `individualText` (e.g. individualText-252). Prefer that over the raw mailbox string.
 */
function extractFromOutlookRecipientPills(surface, preferTo) {
  /** @type {{ person: ReturnType<typeof personFromDisplayNameAndEmail>; score: number }[]} */
  const candidates = [];
  for (const el of iterDeepElements(surface)) {
    if (el.tagName !== "SPAN") continue;
    const cls = el.getAttribute("class") || "";
    if (!cls.includes("individualText")) continue;
    const nameText = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!looksLikePersonDisplayName(nameText)) continue;
    const email = findEmailNearPill(el);
    const score = scorePillAncestorsForRole(el, preferTo);
    candidates.push({
      person: personFromDisplayNameAndEmail(nameText, email),
      score
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (top.score >= 0) return top.person;
  // Recipient: best-effort even when ancestor hints are weak.
  if (preferTo) {
    const withSpace = candidates.find((c) => /\s/.test(c.person.fullName));
    if (withSpace) return withSpace.person;
    return top.person;
  }
  // Sender: do not fall back to arbitrary pills (often the same as To).
  return null;
}

/**
 * Parse "Jane Doe <jane@x.com>", quoted names, or bare email.
 */
export function parsePersonFromRecipientString(raw) {
  const trimmed = String(raw || "").trim();
  const out = emptyPerson();
  if (!trimmed) return out;

  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (angle) {
    let name = angle[1].trim().replace(/^["']|["']$/g, "");
    out.email = angle[2].trim().toLowerCase();
    out.fullName = name || out.email;
  } else {
    EMAIL_RE.lastIndex = 0;
    if (EMAIL_RE.test(trimmed)) {
      EMAIL_RE.lastIndex = 0;
      const m = trimmed.match(EMAIL_RE);
      out.email = (m && m[0] ? m[0] : trimmed).toLowerCase();
      out.fullName = prettyNameFromEmailLocal(out.email.split("@")[0] || "");
    } else {
      out.fullName = trimmed;
    }
  }

  const { first, last } = splitFirstLast(out.fullName);
  out.firstName = first;
  out.lastName = last;
  if (!out.email) {
    EMAIL_RE.lastIndex = 0;
    if (EMAIL_RE.test(out.fullName)) {
      EMAIL_RE.lastIndex = 0;
      const em = out.fullName.match(EMAIL_RE);
      if (em) out.email = em[0].toLowerCase();
    }
  }
  return out;
}

function* iterDeepElements(start) {
  if (!start || start.nodeType !== 1) return;
  const stack = [start];
  while (stack.length) {
    const el = stack.pop();
    yield el;
    if (el.shadowRoot) {
      for (const c of el.shadowRoot.children) stack.push(c);
    }
    for (const c of el.children) stack.push(c);
  }
}

function fieldLabel(el) {
  if (!el || el.nodeType !== 1) return "";
  return `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""} ${el.getAttribute("name") || ""}`.toLowerCase();
}

function classifyRecipientField(lab) {
  if (/^to\b/.test(lab) || lab.includes("to recipients") || lab.includes("to:")) return "to";
  if (/^from\b/.test(lab) || lab.includes("from:")) return "from";
  if (/^cc\b|^bcc\b/.test(lab) || lab.includes("subject")) return "ignore";
  return "";
}

/** Same mailbox identity or identical display — used to avoid To pills as "sender". */
function personsLikelySame(a, b) {
  if (!a || !b) return false;
  const ae = (a.email || "").trim().toLowerCase();
  const be = (b.email || "").trim().toLowerCase();
  if (ae && be && ae === be) return true;
  const an = (a.fullName || `${a.firstName || ""} ${a.lastName || ""}`).replace(/\s+/g, " ").trim().toLowerCase();
  const bn = (b.fullName || `${b.firstName || ""} ${b.lastName || ""}`).replace(/\s+/g, " ").trim().toLowerCase();
  if (an && bn && an === bn) return true;
  return false;
}

function findMectrlPrimaryEl(doc) {
  if (!doc || typeof doc.getElementById !== "function") return null;
  const direct = doc.getElementById("mectrl_currentAccount_primary");
  if (direct) return direct;
  const root = doc.documentElement || doc.body;
  if (!root) return null;
  for (const el of iterDeepElements(root)) {
    if (el.id === "mectrl_currentAccount_primary") return el;
  }
  return null;
}

/** e.g. `Account manager for Luke Colvin` → `Luke Colvin` */
const ACCOUNT_MANAGER_FOR_RE = /^account\s+manager\s+for\s+(.+)$/i;

function displayNameFromO365MeLabel(raw) {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = t.match(ACCOUNT_MANAGER_FOR_RE);
  return m && m[1] ? m[1].trim() : "";
}

function findO365MeEl(doc) {
  if (!doc || typeof doc.getElementById !== "function") return null;
  const direct = doc.getElementById("O365_MainLink_Me");
  if (direct) return direct;
  const root = doc.documentElement || doc.body;
  if (!root) return null;
  for (const el of iterDeepElements(root)) {
    if (el.id === "O365_MainLink_Me") return el;
  }
  return null;
}

function tryMectrlSecondaryEmail(doc) {
  if (!doc || typeof doc.getElementById !== "function") return "";
  const sec = doc.getElementById("mectrl_currentAccount_secondary");
  if (!sec) return "";
  const t = `${sec.getAttribute("aria-label") || ""} ${sec.textContent || ""}`;
  EMAIL_RE.lastIndex = 0;
  const m = t.match(EMAIL_RE);
  return m ? m[0].toLowerCase() : "";
}

function personFromO365MeButton(el) {
  if (!el || el.nodeType !== 1) return null;
  const label = (el.getAttribute("aria-label") || el.getAttribute("title") || "")
    .replace(/\s+/g, " ")
    .trim();
  const display = displayNameFromO365MeLabel(label);
  if (!display || !looksLikePersonDisplayName(display)) return null;
  const email = tryMectrlSecondaryEmail(el.ownerDocument);
  return personFromDisplayNameAndEmail(display, email);
}

function extractSenderFromO365MeAccount(doc) {
  if (!doc) return null;
  return personFromO365MeButton(findO365MeEl(doc));
}

function extractSenderFromO365MeChain(surface) {
  const localDoc = surface && surface.nodeType === 1 ? surface.ownerDocument : null;
  let p = extractSenderFromO365MeAccount(localDoc || (typeof document !== "undefined" ? document : null));
  if (p && (p.fullName || p.email)) return p;
  try {
    if (
      typeof window !== "undefined" &&
      window.top &&
      window.top !== window &&
      window.top.document
    ) {
      p = extractSenderFromO365MeAccount(window.top.document);
      if (p && (p.fullName || p.email)) return p;
    }
  } catch {
    // cross-origin top
  }
  return null;
}

function extractFromInputs(surface, role) {
  for (const el of iterDeepElements(surface)) {
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") continue;
    const lab = fieldLabel(el);
    const kind = classifyRecipientField(lab);
    if (kind !== role) continue;
    const val = (el.value || "").trim();
    if (!val) continue;
    const parts = val.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      const person = parsePersonFromRecipientString(p);
      if (person.email || person.fullName) return person;
    }
  }
  return null;
}

/**
 * Sender display name from `#mectrl_currentAccount_primary`: `aria-label` (e.g. "Luke Colvin")
 * drives `{sender_full_name}`, `{sender_first_name}` (first token), `{sender_last_name}` (rest).
 */
function personFromMectrlPrimary(el) {
  if (!el || el.nodeType !== 1) return null;
  const fromLabel = (el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
  const fromText = (el.textContent || "").replace(/\s+/g, " ").trim();
  const display = fromLabel || fromText;
  if (!display || !looksLikePersonDisplayName(display)) return null;
  const email = tryMectrlSecondaryEmail(el.ownerDocument);
  return personFromDisplayNameAndEmail(display, email);
}

/**
 * Signed-in account from Outlook header (Microsoft account control).
 * Compose surface may live in an iframe; try ownerDocument then top window document.
 */
function extractSenderFromMectrlAccount(doc) {
  if (!doc) return null;
  const el = findMectrlPrimaryEl(doc);
  return personFromMectrlPrimary(el);
}

function extractSenderFromMectrlAccountChain(surface) {
  const localDoc = surface && surface.nodeType === 1 ? surface.ownerDocument : null;
  let p = extractSenderFromMectrlAccount(localDoc || (typeof document !== "undefined" ? document : null));
  if (p && (p.fullName || p.email)) return p;
  try {
    if (
      typeof window !== "undefined" &&
      window.top &&
      window.top !== window &&
      window.top.document
    ) {
      p = extractSenderFromMectrlAccount(window.top.document);
      if (p && (p.fullName || p.email)) return p;
    }
  } catch {
    // cross-origin top
  }
  return null;
}

function extractFromEmailTokens(surface, preferNear) {
  const scores = new Map();
  const localRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  for (const el of iterDeepElements(surface)) {
    let chain = "";
    let path = el;
    for (let i = 0; i < 8 && path; i++) {
      chain += ` ${fieldLabel(path)}`;
      path = path.parentElement;
    }
    chain = chain.toLowerCase();
    const t = `${el.getAttribute?.("title") || ""} ${el.getAttribute?.("aria-label") || ""} ${(el.textContent || "").slice(0, 200)}`;
    let m;
    localRe.lastIndex = 0;
    while ((m = localRe.exec(t))) {
      const email = m[0].toLowerCase();
      let sc = 0;
      if (preferNear === "to") {
        if (/\bto\b/.test(chain)) sc += 5;
        if (/\bfrom\b/.test(chain)) sc -= 4;
        if (/\bsubject\b/.test(chain)) sc -= 3;
      } else {
        if (/\bfrom\b/.test(chain)) sc += 6;
        if (/\bto\b/.test(chain)) sc -= 2;
      }
      scores.set(email, Math.max(scores.get(email) || -999, sc));
    }
  }
  let bestEmail = null;
  let bestSc = -999;
  for (const [email, sc] of scores) {
    if (sc > bestSc) {
      bestSc = sc;
      bestEmail = email;
    }
  }
  if (bestEmail) {
    return parsePersonFromRecipientString(bestEmail);
  }
  return null;
}

function pickSenderDistinctFromRecipient(surface, recipient) {
  const sources = [
    () => extractSenderFromO365MeChain(surface),
    () => extractSenderFromMectrlAccountChain(surface),
    () => extractFromOutlookRecipientPills(surface, false),
    () => extractFromInputs(surface, "from"),
    () => extractFromEmailTokens(surface, "from")
  ];
  for (const get of sources) {
    let p = null;
    try {
      p = get();
    } catch {
      p = null;
    }
    if (!p || (!(p.fullName || "").trim() && !(p.email || "").trim())) continue;
    if (!personsLikelySame(p, recipient)) return p;
  }
  return emptyPerson();
}

/**
 * Build recipient (primary To) and sender (From) for placeholder expansion.
 */
export function buildComposeSnippetContext(surface) {
  if (!surface || surface.nodeType !== 1) {
    return { recipient: emptyPerson(), sender: emptyPerson() };
  }

  const recipient =
    extractFromOutlookRecipientPills(surface, true) ||
    extractFromInputs(surface, "to") ||
    extractFromEmailTokens(surface, "to") ||
    emptyPerson();

  const sender = pickSenderDistinctFromRecipient(surface, recipient);

  return { recipient, sender };
}

/**
 * Replace known name tokens from To/From. Leaves `{your_placeholder}` for send-time fill.
 */
export function expandSnippetVariables(text, context) {
  if (!text || typeof text !== "string") return "";
  const ctx = context || { recipient: emptyPerson(), sender: emptyPerson() };
  const r = ctx.recipient || emptyPerson();
  const s = ctx.sender || emptyPerson();

  const map = new Map([
    ["{full_name}", r.fullName || [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || r.email || ""],
    ["{first_name}", r.firstName || ""],
    ["{last_name}", r.lastName || ""],
    ["{sender_full_name}", s.fullName || [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || s.email || ""],
    ["{sender_first_name}", s.firstName || ""],
    ["{sender_last_name}", s.lastName || ""]
  ]);

  let out = text;
  for (const [token, val] of map) {
    out = out.split(token).join(val);
  }
  return out;
}

export function messageContainsYourPlaceholder(plain) {
  return typeof plain === "string" && plain.includes(YOUR_PLACEHOLDER);
}
