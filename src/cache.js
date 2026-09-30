export const SNAPSHOT_KEY = "catalogSnapshot";

function storage() {
  return globalThis.chrome?.storage?.session;
}

export function isCatalogSnapshot(value) {
  return Boolean(
    value &&
      Number.isFinite(value.updatedAt) &&
      Number.isInteger(value.tabId) &&
      value.account &&
      typeof value.account.user === "string" &&
      value.account.user &&
      /^\d+$/.test(String(value.account.orgId)) &&
      Array.isArray(value.account.projects) &&
      typeof value.project === "string" &&
      Array.isArray(value.targets) &&
      Array.isArray(value.catalog),
  );
}

export async function getCatalogSnapshot() {
  const area = storage();
  if (!area) return null;
  const value = (await area.get(SNAPSHOT_KEY))[SNAPSHOT_KEY];
  return isCatalogSnapshot(value) ? value : null;
}

export async function rememberCatalogSnapshot(snapshot) {
  const area = storage();
  if (!area) return;
  await area.set({ [SNAPSHOT_KEY]: structuredClone(snapshot) });
}

export async function forgetCatalogSnapshot() {
  const area = storage();
  if (area) await area.remove(SNAPSHOT_KEY);
}
