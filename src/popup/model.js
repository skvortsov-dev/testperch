/** Pure catalog logic. No browser or DOM dependencies. */
export function isExperiment(item) {
  return String(item.type).toLowerCase() === "experiment";
}

export function filterCatalog(catalog, { scope, kind, query }) {
  const search = query.trim().toLowerCase();
  return catalog.filter((item) => {
    if (scope === "mine" && !item.variants.length) return false;
    if (kind === "experiment" && !isExperiment(item)) return false;
    if (kind === "flag" && isExperiment(item)) return false;
    return `${item.name} ${item.key || ""}`.toLowerCase().includes(search);
  });
}

export function assignmentCount(catalog) {
  return catalog.filter((item) => item.variants.length > 0).length;
}
