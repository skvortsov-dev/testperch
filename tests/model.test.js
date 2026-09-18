import test from "node:test";
import assert from "node:assert/strict";
import { filterCatalog, assignmentCount } from "../src/popup/model.js";
const catalog = [
  {
    id: "a",
    name: "Checkout",
    key: "custom-checkout",
    type: "EXPERIMENT",
    variants: [{ key: "express" }],
  },
  { id: "b", name: "Search", key: "smart-search", type: "FLAG", variants: [] },
];
test("My tests excludes unassigned items while Find tests can find them by key", () => {
  assert.deepEqual(
    filterCatalog(catalog, { scope: "mine", kind: "all", query: "" }).map(
      (x) => x.id,
    ),
    ["a"],
  );
  assert.deepEqual(
    filterCatalog(catalog, {
      scope: "all",
      kind: "flag",
      query: " SMART-search ",
    }).map((x) => x.id),
    ["b"],
  );
  assert.equal(assignmentCount(catalog), 1);
});
test("type filtering and name search work together", () => {
  assert.equal(
    filterCatalog(catalog, {
      scope: "all",
      kind: "experiment",
      query: "Checkout",
    }).length,
    1,
  );
  assert.equal(
    filterCatalog(catalog, { scope: "all", kind: "flag", query: "Checkout" })
      .length,
    0,
  );
});
