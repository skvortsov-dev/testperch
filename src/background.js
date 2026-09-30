import { amplitudeSession } from "./amplitude/session.js";
import {
  getCatalogSnapshot,
  rememberCatalogSnapshot,
} from "./cache.js";
import { findReadySession } from "./popup/connection.js";

const ALARM = "refresh-testing-assignments";
const REFRESH_MINUTES = 5;

async function requestSession(tabId, action, args = {}) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: amplitudeSession,
    args: [action, args],
  });
  const data = results[0]?.result;
  if (!data?.ok) throw new Error(data?.error || "Amplitude is unavailable.");
  return data;
}

export async function refreshCatalogSnapshot() {
  const [{ autoConnect }, { connection }, snapshot] = await Promise.all([
    chrome.storage.local.get("autoConnect"),
    chrome.storage.session.get("connection"),
    getCatalogSnapshot(),
  ]);
  if (
    autoConnect === false ||
    !connection ||
    !snapshot ||
    !connection.project ||
    !connection.targets?.length
  )
    return false;

  const tabs = await chrome.tabs.query({
    url: ["https://app.amplitude.com/*", "https://app.eu.amplitude.com/*"],
  });
  const tabId = await findReadySession(tabs, connection, requestSession);
  if (tabId === null) return false;
  const data = await requestSession(tabId, "scan", {
    user: connection.user,
    orgId: connection.orgId,
    project: connection.project,
    targets: connection.targets,
  });
  // Do not let a slower background read overwrite a newer panel refresh or
  // a catalog saved after an assignment change.
  const [current, { connection: currentConnection }] = await Promise.all([
    getCatalogSnapshot(),
    chrome.storage.session.get("connection"),
  ]);
  if (
    !current ||
    current.updatedAt !== snapshot.updatedAt ||
    JSON.stringify(currentConnection) !== JSON.stringify(connection)
  )
    return false;
  await chrome.storage.session.set({
    connection: { ...connection, tabId },
  });
  await rememberCatalogSnapshot({
    ...snapshot,
    tabId,
    project: connection.project,
    targets: connection.targets,
    catalog: data.catalog,
    updatedAt: Date.now(),
  });
  return true;
}

async function scheduleRefresh() {
  await chrome.alarms.create(ALARM, {
    delayInMinutes: 1,
    periodInMinutes: REFRESH_MINUTES,
  });
}

async function configureSidePanel() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  void scheduleRefresh();
  void configureSidePanel().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  void scheduleRefresh();
  void configureSidePanel().catch(() => {});
});
void configureSidePanel().catch(() => {});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void refreshCatalogSnapshot().catch(() => {});
});
