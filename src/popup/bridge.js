import { amplitudeSession } from "../amplitude/session.js";

export const extensionAvailable = Boolean(globalThis.chrome?.scripting);

export async function listAmplitudeTabs() {
  if (!extensionAvailable) return [];

  // Remove credentials retained by pre-session versions of the prototype.
  await chrome.storage.local.remove(["apiKey", "managementApiKey"]);

  const tabs = await chrome.tabs.query({
    url: ["https://app.amplitude.com/*", "https://app.eu.amplitude.com/*"],
  });
  return tabs.sort((a, b) => Number(b.active) - Number(a.active));
}

/** The injected function must remain self-contained: Chrome serializes it. */
export async function requestSession(tabId, action, args = {}) {
  if (!extensionAvailable)
    throw new Error("Install TestPerch in Chrome to connect.");
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: amplitudeSession,
    args: [action, args],
  });
  const data = results[0]?.result;
  if (!data?.ok) {
    throw new Error(
      data?.error || "No response from Amplitude. Reconnect and try again.",
    );
  }
  return data;
}

export async function openAmplitude() {
  const url = "https://app.amplitude.com/";
  if (extensionAvailable) {
    const tabs = await listAmplitudeTabs();
    const selected =
      tabs.find(
        (tab) => String(tab.id) === document.getElementById("tab").value,
      ) || tabs[0];
    if (selected) {
      await chrome.tabs.update(selected.id, { active: true });
      await chrome.windows.update(selected.windowId, { focused: true });
    } else await chrome.tabs.create({ url });
  } else window.open(url, "_blank", "noopener");
}
