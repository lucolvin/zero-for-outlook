export function applyTheme(darkEnabled) {
  const html = document.documentElement;
  const body = document.body;
  if (!html || !body) return;
  if (darkEnabled) {
    html.classList.add("oz-theme-dark");
    body.classList.add("oz-theme-dark");
  } else {
    html.classList.remove("oz-theme-dark");
    body.classList.remove("oz-theme-dark");
  }
}


