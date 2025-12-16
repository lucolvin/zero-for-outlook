export function setStatus(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add("oz-status-visible");
  setTimeout(() => {
    el.classList.remove("oz-status-visible");
  }, 2000);
}


