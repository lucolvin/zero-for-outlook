// @ts-nocheck
// Optional (NFS): shorten Fluent list row transitions when archiving — gated by setting.

const STYLE_ID = "oz-archive-list-motion-style";

export function setArchiveListMotionReduced(enabled) {
  const on = !!enabled;
  document.documentElement.classList.toggle("oz-archive-motion-reduced", on);
  const existing = document.getElementById(STYLE_ID);
  if (!on) {
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
html.oz-archive-motion-reduced [role="grid"] [role="row"],
html.oz-archive-motion-reduced [role="listbox"] [role="option"],
html.oz-archive-motion-reduced [role="treegrid"] [role="row"] {
  animation-duration: 0.001ms !important;
  transition-duration: 0.001ms !important;
  transition-delay: 0s !important;
}
`;
  document.documentElement.appendChild(style);
}
