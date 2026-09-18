/** Find a ready session without querying catalogs or changing any assignments. */
export async function findReadySession(tabs, saved, request) {
  const ordered = [...tabs].sort(
    (a, b) => Number(b.id === saved?.tabId) - Number(a.id === saved?.tabId),
  );
  for (const tab of ordered) {
    let probe;
    try {
      probe = await request(tab.id, "probe");
    } catch {
      continue;
    } // A closed, loading, or inaccessible tab is not a session.
    if (probe.ready) return tab.id;
  }
  return null;
}
