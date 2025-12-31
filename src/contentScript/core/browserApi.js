// Browser API wrapper for Chrome/Firefox compatibility
export const browserApi = typeof chrome !== "undefined" ? chrome : browser;

