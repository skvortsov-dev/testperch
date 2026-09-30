import test from "node:test";
import assert from "node:assert/strict";
import {
  getCatalogSnapshot,
  rememberCatalogSnapshot,
  forgetCatalogSnapshot,
} from "../src/cache.js";

function sessionStorage(data) {
  return {
    get: async (key) => ({ [key]: structuredClone(data[key]) }),
    set: async (values) => Object.assign(data, structuredClone(values)),
    remove: async (key) => delete data[key],
  };
}

test("catalog snapshot is session-only, validated, and removable", async (t) => {
  const original = globalThis.chrome;
  const data = {};
  globalThis.chrome = { storage: { session: sessionStorage(data) } };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  assert.equal(await getCatalogSnapshot(), null);
  data.catalogSnapshot = { updatedAt: Date.now(), catalog: [] };
  assert.equal(await getCatalogSnapshot(), null);

  const snapshot = {
    tabId: 7,
    account: { user: "qa@example.com", orgId: "9", projects: [] },
    project: "42",
    targets: ["qa@example.com"],
    catalog: [{ id: "1" }],
    updatedAt: Date.now(),
  };
  await rememberCatalogSnapshot(snapshot);
  snapshot.catalog[0].id = "changed-after-save";
  assert.equal((await getCatalogSnapshot()).catalog[0].id, "1");
  await forgetCatalogSnapshot();
  assert.equal(await getCatalogSnapshot(), null);
});
