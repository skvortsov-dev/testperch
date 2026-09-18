/** Persist an explicit disconnect without storing credentials or user data. */
export async function isAutoConnectEnabled() {
  if (globalThis.chrome?.storage)
    return (
      (await chrome.storage.local.get("autoConnect")).autoConnect !== false
    );
  return localStorage.getItem("testperch-auto-connect") !== "false";
}

export async function setAutoConnectEnabled(enabled) {
  if (globalThis.chrome?.storage)
    await chrome.storage.local.set({ autoConnect: enabled });
  else localStorage.setItem("testperch-auto-connect", String(enabled));
}
