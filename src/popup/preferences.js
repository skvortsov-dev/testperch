const THEMES = ["system", "light", "dark"];
const media = window.matchMedia("(prefers-color-scheme: dark)");
let theme = "system";

function applyTheme() {
  const dark = theme === "dark" || (theme === "system" && media.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const button = document.getElementById("theme");
  const label = `Theme: ${theme}. Click to switch.`;
  button.textContent = theme === "system" ? "◐" : theme === "dark" ? "☾" : "☀";
  button.title = label;
  button.setAttribute("aria-label", label);
}

export async function initializeTheme() {
  try {
    const saved = globalThis.chrome?.storage
      ? (await chrome.storage.local.get("theme")).theme
      : localStorage.getItem("testperch-theme") ||
        localStorage.getItem("flagfinch-theme");
    if (THEMES.includes(saved)) theme = saved;
  } catch {
    /* Storage may be unavailable in a restricted preview. */
  }
  applyTheme();
  media.addEventListener("change", applyTheme);
  document.getElementById("theme").onclick = async () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme();
    if (globalThis.chrome?.storage) await chrome.storage.local.set({ theme });
    else {
      try {
        localStorage.setItem("testperch-theme", theme);
      } catch {
        /* Optional. */
      }
    }
  };
}

export async function getConnection() {
  return globalThis.chrome?.storage
    ? (await chrome.storage.session.get("connection")).connection
    : null;
}

export async function rememberConnection(tabId, project, identity = {}) {
  if (globalThis.chrome?.storage)
    await chrome.storage.session.set({
      connection: { tabId, project, ...identity },
    });
}

export async function forgetConnection() {
  if (globalThis.chrome?.storage)
    await chrome.storage.session.remove("connection");
}
