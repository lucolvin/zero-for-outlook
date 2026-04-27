/**
 * Escape a string for CSS selectors (ids, classes, attribute values).
 * @param {string | number | null | undefined} value
 */
export function escapeCss(value) {
  const str = String(value ?? "");
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(str);
  }
  // Fallback (e.g. very old browsers): safe enough for Outlook attribute quoting
  return str
    .replace(/\u0000/g, "\uFFFD")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}
